#!/usr/bin/env python3
"""Inspect resolved Compose JSON. Never print credentials or execute .env as shell."""
import argparse
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import urlsplit

class InvalidConfig(Exception):
    pass

def need(ok, key):
    if not ok:
        raise InvalidConfig("Deployment configuration invalid or missing: " + key)

def origin(value, key):
    try:
        u = urlsplit(value)
        host = u.hostname or ""
        need(u.scheme == "https" and bool(host) and not u.username and not u.password and u.path in ("", "/") and not u.query and not u.fragment, key)
        need(re.fullmatch(r"[A-Za-z0-9.-]+", host) is not None, key + " (IPv4 or DNS hostname required)")
        try:
            ipaddress.ip_address(host)
        except ValueError:
            need(not host.startswith(".") and ".." not in host, key)
        port = u.port or 443
        need(1 <= port <= 65535, key)
        need(host not in ("offy.example.com", "admin.offy.example.com"), key)
        return u, host, port
    except (ValueError, TypeError):
        raise InvalidConfig("Deployment configuration invalid or missing: " + key)

def validate(c, explicit=False):
    app = c.get("services", {}).get("app", {})
    env = app.get("environment", {})
    for key in ("SITE_URL", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_STOREFRONT_TOKEN"):
        need(isinstance(env.get(key), str) and bool(env[key].strip()), key)
    need(env.get("NODE_ENV") == "production", "NODE_ENV")
    need(env.get("DATABASE_PROVIDER") == "sqlite", "DATABASE_PROVIDER")
    db = env.get("DATABASE_URL", "")
    need(isinstance(db, str) and db.startswith("/data/") and ".." not in PurePosixPath(db).parts and db != "/data/", "DATABASE_URL must be under the persistent /data volume")
    need(any(v.get("target") == "/data" and v.get("type") == "volume" for v in app.get("volumes", [])), "app.volumes /data")
    ports = [p for p in app.get("ports", []) if p.get("target") == 3000]
    need(len(ports) == 1 and ports[0].get("host_ip") == "127.0.0.1" and str(ports[0].get("published")) == "3000", "app.ports loopback 3000")
    need(env.get("KOL_ENABLED", "false") in ("true", "false"), "KOL_ENABLED")
    need(env.get("KOL_SETTLEMENTS_ENABLED", "false") in ("true", "false"), "KOL_SETTLEMENTS_ENABLED")
    key = env.get("CHECKOUT_DIAGNOSTICS_KEY", "")
    need(not key or re.fullmatch(r"[a-fA-F0-9]{64}", key) is not None, "CHECKOUT_DIAGNOSTICS_KEY must be 64 hex characters")
    kol = env.get("KOL_ENABLED") == "true"
    need(not explicit or kol, "KOL_ENABLED=true is required by --kol")
    need(not (env.get("KOL_SETTLEMENTS_ENABLED") == "true" and not kol), "KOL_SETTLEMENTS_ENABLED requires KOL_ENABLED")
    if not kol:
        return False
    _, site_host, site_port = origin(env["SITE_URL"], "SITE_URL")
    _, admin_host, admin_port = origin(env.get("ADMIN_ORIGIN", ""), "ADMIN_ORIGIN")
    need(env.get("ADMIN_ORIGIN") == f"https://{admin_host}:{admin_port}", "ADMIN_ORIGIN must be an exact origin without trailing slash")
    need(admin_port not in (80, 443, 3000, 3001, site_port), "ADMIN_ORIGIN must use a separate explicit HTTPS port")
    secrets = []
    for key in ("KOL_INGRESS_SECRET", "KOL_SIGNING_SECRET", "KOL_WORKER_SECRET"):
        value = env.get(key, "")
        need(isinstance(value, str) and len(value) >= 32, key)
        secrets.append(value)
    need(len(set(secrets)) == 3, "KOL secrets must be distinct")
    need(re.fullmatch(r"[A-Za-z0-9_-]{32,128}", env["KOL_INGRESS_SECRET"]) is not None, "KOL_INGRESS_SECRET must use hex/base64url characters")
    for key in ("SHOPIFY_ADMIN_TOKEN", "SHOPIFY_WEBHOOK_SECRET"):
        need(bool(env.get(key, "").strip()), key)
    worker = c.get("services", {}).get("kol-worker", {})
    need(worker.get("environment", {}).get("KOL_WORKER_SECRET") == env["KOL_WORKER_SECRET"], "kol-worker KOL_WORKER_SECRET")
    admin = c.get("services", {}).get("admin", {})
    admin_env = admin.get("environment", {})
    for key in ("NODE_ENV", "DATABASE_PROVIDER", "DATABASE_URL", "SITE_URL", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_STOREFRONT_TOKEN", "SHOPIFY_ADMIN_TOKEN", "SHOPIFY_API_VERSION", "KOL_ENABLED", "KOL_SETTLEMENTS_ENABLED", "ADMIN_ORIGIN", "KOL_INGRESS_SECRET", "KOL_SIGNING_SECRET", "KOL_WORKER_SECRET", "SHOPIFY_WEBHOOK_SECRET", "KOL_ADMIN_BOOTSTRAP_HASH", "CHECKOUT_DIAGNOSTICS_KEY"):
        need(admin_env.get(key) == env.get(key), "admin must match app: " + key)
    app_data = [v for v in app.get("volumes", []) if v.get("target") == "/data"]
    admin_data = [v for v in admin.get("volumes", []) if v.get("target") == "/data"]
    need(len(app_data) == len(admin_data) == 1 and app_data[0].get("source") and app_data[0] == admin_data[0], "admin and app must share the same /data volume")
    admin_ports = admin.get("ports", [])
    need(len(admin_ports) == 1 and admin_ports[0].get("host_ip") == "127.0.0.1" and str(admin_ports[0].get("published")) == "3001" and admin_ports[0].get("target") == 3000, "admin.ports loopback 3001")
    need(bool(admin.get("image")) and admin["image"] != app.get("image", "offy-app:local"), "admin must use an independent image tag")
    need(worker.get("image") == admin["image"], "admin and worker image")
    need(worker.get("environment", {}).get("KOL_WORKER_URL") == "http://admin:3000/api/kol/worker", "kol-worker must call admin")
    bootstrap = env.get("KOL_ADMIN_BOOTSTRAP_HASH", "")
    need(not bootstrap or re.fullmatch(r"scrypt:[a-f0-9]{32}:[a-f0-9]{128}", bootstrap) is not None, "KOL_ADMIN_BOOTSTRAP_HASH")
    meta = c.get("x-offy-deploy", {})
    if meta.get("nginx_config"):
        need(os.path.isabs(meta["nginx_config"]), "DEPLOY_NGINX_CONFIG")
        for key in ("site_tls_certificate", "site_tls_key", "admin_tls_certificate", "admin_tls_key"):
            value = meta.get(key, "")
            need(isinstance(value, str) and os.path.isabs(value) and Path(value).is_file(), "DEPLOY_" + key.upper())
    if meta.get("ca_file"):
        need(Path(meta["ca_file"]).is_file(), "DEPLOY_CA_FILE")
    return True

def running_storefront(c, containers):
    need(isinstance(containers, list) and len(containers) == 1, "running storefront container")
    container = containers[0]
    state = container.get("State", {})
    need(state.get("Running") is True and state.get("Health", {}).get("Status") == "healthy", "storefront must already be healthy")
    actual = dict(item.split("=", 1) for item in container.get("Config", {}).get("Env", []) if "=" in item)
    expected = c["services"]["app"]["environment"]
    for key in ("NODE_ENV", "DATABASE_PROVIDER", "DATABASE_URL", "SITE_URL", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_API_VERSION", "KOL_ENABLED", "KOL_SETTLEMENTS_ENABLED", "ADMIN_ORIGIN", "KOL_INGRESS_SECRET", "KOL_SIGNING_SECRET", "KOL_WORKER_SECRET", "SHOPIFY_WEBHOOK_SECRET", "SHOPIFY_ADMIN_TOKEN", "CHECKOUT_DIAGNOSTICS_KEY"):
        need((actual.get(key) or "") == (expected.get(key) or ""), "running storefront configuration differs: " + key + "; deploy storefront and admin together first")
    data = next(v for v in c["services"]["app"]["volumes"] if v["target"] == "/data")
    volume_name = c.get("volumes", {}).get(data["source"], {}).get("name")
    mounts = [m for m in container.get("Mounts", []) if m.get("Destination") == "/data"]
    need(bool(volume_name) and len(mounts) == 1 and mounts[0].get("Type") == "volume" and mounts[0].get("Name") == volume_name and mounts[0].get("RW") is True, "running storefront must share the existing writable data volume")

def quoted(value):
    need(isinstance(value, str) and not any(ch in value for ch in ("\n", "\r", "\x00")), "Nginx value")
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$") + '"'

def render(c):
    need(validate(c, True), "KOL_ENABLED")
    env, meta = c["services"]["app"]["environment"], c.get("x-offy-deploy", {})
    need(bool(meta.get("nginx_config")), "DEPLOY_NGINX_CONFIG")
    _, host, port = origin(env["SITE_URL"], "SITE_URL")
    _, admin_host, admin_port = origin(env["ADMIN_ORIGIN"], "ADMIN_ORIGIN")
    cert, key = quoted(meta["site_tls_certificate"]), quoted(meta["site_tls_key"])
    ac, ak = quoted(meta["admin_tls_certificate"]), quoted(meta["admin_tls_key"])
    common = '''        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Middleware-Subrequest "";'''
    return f'''# Generated by Offy deployment; contains a private ingress marker. Keep mode 600.
server {{
    listen 80;
    server_name {host};
    location /.well-known/acme-challenge/ {{ root /var/www/certbot; }}
    location / {{ return 301 {env["SITE_URL"].rstrip("/")}$request_uri; }}
}}
server {{
    listen {port} ssl;
    server_name {host};
    ssl_certificate {cert};
    ssl_certificate_key {key};
    if ($host != {host}) {{ return 444; }}
    location ~* "^/(?:[a-z]{{2}}(?:-[a-z]{{2}})?/)?(?:admin|api/admin)(?:/|$)" {{ return 404; }}
    location = /api/kol/worker {{ return 404; }}
    location / {{
{common}
        proxy_set_header X-Offy-Admin-Ingress "";
    }}
}}
server {{
    listen {admin_port} ssl;
    server_name {admin_host};
    ssl_certificate {ac};
    ssl_certificate_key {ak};
    if ($host != {admin_host}) {{ return 444; }}
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header Cache-Control "no-store, private" always;
    location ~ ^/(?:admin(?:/|$)|api/admin/kol(?:/|$)|_next/(?:static|image)(?:/|$)) {{
{common.replace("127.0.0.1:3000", "127.0.0.1:3001")}
        proxy_set_header X-Offy-Admin-Ingress {quoted(env["KOL_INGRESS_SECRET"])};
        proxy_read_timeout 120s;
    }}
    location / {{ return 404; }}
}}
'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("validate", "value", "render-nginx", "running-storefront"))
    parser.add_argument("input", nargs="?", default="-")
    parser.add_argument("--kol", action="store_true")
    parser.add_argument("--key")
    parser.add_argument("--output")
    args = parser.parse_args()
    try:
        c = json.load(sys.stdin if args.input == "-" else open(args.input, encoding="utf8"))
        if args.command == "validate":
            mode = validate(c, args.kol)
            print("Configuration valid: " + ("storefront + KOL" if mode else "storefront"))
        elif args.command == "running-storefront":
            running_storefront(c, json.load(sys.stdin))
            print("Running storefront configuration and shared volume match")
        elif args.command == "value":
            env, meta = c["services"]["app"]["environment"], c.get("x-offy-deploy", {})
            values = {"kol": str(env.get("KOL_ENABLED") == "true").lower(), "site_url": env["SITE_URL"], "admin_origin": env.get("ADMIN_ORIGIN", ""), "nginx_config": meta.get("nginx_config", ""), "ca_file": meta.get("ca_file", "")}
            need(args.key in values, "Unknown non-secret output key")
            print(values[args.key])
        else:
            need(bool(args.output), "--output")
            text = render(c)
            fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w", encoding="utf8") as f:
                f.write(text)
            os.chmod(args.output, 0o600)
    except InvalidConfig as e:
        print(str(e), file=sys.stderr)
        return 1
    except (KeyError, TypeError, ValueError, OSError):
        print("Invalid Compose configuration or inaccessible deployment file", file=sys.stderr)
        return 1
    return 0
if __name__ == "__main__":
    sys.exit(main())
