"""Validate and exercise actual Nginx using isolated loopback TLS listeners.
Requires the local integration app on localhost:3900. No system config is changed.
"""
from pathlib import Path
import tempfile, subprocess, re, ssl, http.client, time, json, shutil, sys
deployment_mode = "--deployment-template" in sys.argv
site_host = "shop.offy.test" if deployment_mode else "offy.example.com"
admin_host = "admin.offy.test" if deployment_mode else "admin.offy.example.com"
folder = Path(tempfile.mkdtemp(prefix="offy-kol-nginx-"))
subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", str(folder / "key.pem"), "-out", str(folder / "cert.pem"), "-days", "1", "-subj", f"/CN={site_host}", "-addext", f"subjectAltName=DNS:{site_host},DNS:{admin_host},IP:127.0.0.1"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
if deployment_mode:
    cert, key = str(folder / "cert.pem"), str(folder / "key.pem")
    metadata = {"nginx_config": str(folder / "offy.conf"), "site_tls_certificate": cert, "site_tls_key": key, "admin_tls_certificate": cert, "admin_tls_key": key, "ca_file": cert}
    runtime = {"NODE_ENV": "production", "DATABASE_PROVIDER": "sqlite", "DATABASE_URL": "/data/offy.db", "SITE_URL": f"https://{site_host}:49443", "ADMIN_ORIGIN": f"https://{admin_host}:49444", "SHOPIFY_STORE_DOMAIN": "offy-integration.myshopify.com", "SHOPIFY_STOREFRONT_TOKEN": "dummy", "SHOPIFY_ADMIN_TOKEN": "dummy", "SHOPIFY_WEBHOOK_SECRET": "dummy", "KOL_ENABLED": "true", "KOL_INGRESS_SECRET": "integration-ingress-only-0000000000000000", "KOL_SIGNING_SECRET": "b"*64, "KOL_WORKER_SECRET": "c"*64}
    payload = {"services": {"app": {"environment": runtime, "ports": [{"host_ip": "127.0.0.1", "target": 3000, "published": "3000"}], "volumes": [{"type": "volume", "source": "offy-data", "target": "/data"}]}, "kol-worker": {"environment": {"KOL_WORKER_SECRET": "c"*64}}}, "x-offy-deploy": metadata}
    payload["services"]["app"]["image"] = "offy-app:local"
    payload["services"]["admin"] = {**payload["services"]["app"], "image": "offy-admin:local", "ports": [{"host_ip": "127.0.0.1", "target": 3000, "published": "3001"}]}
    payload["services"]["kol-worker"]["image"] = "offy-admin:local"
    payload["services"]["kol-worker"]["environment"]["KOL_WORKER_URL"] = "http://admin:3000/api/kol/worker"
    config_json = folder / "compose.json"
    config_json.write_text(json.dumps(payload))
    config_json.chmod(0o600)
    subprocess.run(["python3", "deploy/compose-config.py", "render-nginx", str(config_json), "--output", metadata["nginx_config"]], check=True)
    s = Path(metadata["nginx_config"]).read_text()
else:
    s = Path("deploy/nginx-kol.conf").read_text()
s = re.sub(r"ssl_certificate [^;]+;", f"ssl_certificate {folder}/cert.pem;", s)
s = re.sub(r"ssl_certificate_key [^;]+;", f"ssl_certificate_key {folder}/key.pem;", s)
s = s.replace("listen 80;", "listen 127.0.0.1:49080;").replace("listen 443 ssl;", "listen 127.0.0.1:49443 ssl;").replace("listen 8443 ssl;", "listen 127.0.0.1:49444 ssl;").replace("http://127.0.0.1:3000", "http://localhost:3900").replace("http://127.0.0.1:3001", "http://localhost:3900").replace("REPLACE_WITH_RANDOM_INGRESS_SECRET_AT_LEAST_32_CHARS", "integration-ingress-only-0000000000000000")
s = s.replace("listen 49443 ssl;", "listen 127.0.0.1:49443 ssl;").replace("listen 49444 ssl;", "listen 127.0.0.1:49444 ssl;")
conf = folder / "nginx.conf"
conf.write_text(f"worker_processes 1;\nerror_log {folder}/error.log;\npid {folder}/nginx.pid;\nevents {{worker_connections 64;}}\nhttp {{access_log off;\n{s}\n}}")
subprocess.run(["nginx", "-t", "-p", str(folder), "-c", str(conf)], check=True)
process = subprocess.Popen(["nginx", "-p", str(folder), "-c", str(conf), "-g", "daemon off;"])
context = ssl.create_default_context(cafile=str(folder / "cert.pem"))
def request(port, path, host, headers=None):
    connection = http.client.HTTPSConnection("127.0.0.1", port, context=context, timeout=15)
    connection.request("GET", path, headers={"Host": host, **(headers or {})})
    response = connection.getresponse()
    status = response.status
    response.read()
    connection.close()
    return status
try:
    time.sleep(0.3)
    count = 0
    for path in ["/admin", "/admin/partners", "/api/admin/kol/state", "/en/admin", "/zh/admin", "/%61dmin", "/admin%2fpartners", "/ADMIN", "/api/kol/worker"]:
        status = request(49443, path, site_host, {"X-Offy-Admin-Ingress": "integration-ingress-only-0000000000000000"})
        assert status == 404, (path, status)
        count += 1
    assert request(49444, "/admin", admin_host) == 200
    assert request(49444, "/api/admin/kol/state", admin_host) == 401
    assert request(49444, "/products", admin_host) == 404
    count += 3
    try:
        request(49444, "/admin", "evil.test")
        raise AssertionError("Unknown host was not rejected")
    except http.client.RemoteDisconnected:
        count += 1
    if deployment_mode:
        subprocess.run(["bash", "deploy/check-ingress.sh", str(config_json)], check=True)
    print(json.dumps({"nginx_syntax": "passed", "tls_boundary_checks": count, "certificate_validation": "isolated CA, no verification bypass", "production_config_changed": False}))
finally:
    process.terminate()
    process.wait(timeout=10)
    shutil.rmtree(folder)
