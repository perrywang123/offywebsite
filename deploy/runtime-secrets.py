#!/usr/bin/env python3
"""Server-private internal authentication. Never prints a credential value."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import tempfile

KEYS = ("KOL_INGRESS_SECRET", "KOL_SIGNING_SECRET", "KOL_WORKER_SECRET")


def fail(reason):
    raise ValueError(reason)


def private_json(path, value):
    fd, temporary = tempfile.mkstemp(prefix=".offy-runtime-", suffix=".local", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            os.fchmod(stream.fileno(), 0o600)
            json.dump(value, stream)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def docker_json(command):
    result = subprocess.run(command, capture_output=True, text=True, timeout=20)
    if result.returncode:
        fail("cannot inspect existing containers; check Docker access before preparing internal authentication")
    return result.stdout


def prepare(args, config, root):
    environment = config["services"]["app"]["environment"]
    path = root / ".offy-runtime-secrets.json"
    stored = json.loads(path.read_text()) if path.exists() else {}
    if not isinstance(stored, dict) or any(key not in KEYS for key in stored):
        fail("invalid server-private authentication file; preserve it for recovery")
    for key, value in stored.items():
        if not isinstance(value, str) or len(value) < 32:
            fail("invalid stored " + key)
    command = ["docker", "compose", "--env-file", str(args.env_file), "-f", str(root / "docker-compose.prod.yml"), "--profile", "kol", "ps", "-q", "app", "admin"]
    ids = docker_json(command).split()
    containers = json.loads(docker_json(["docker", "inspect", *ids])) if ids else []
    running = {key: set() for key in KEYS}
    for container in containers:
        if not container.get("State", {}).get("Running"):
            continue
        actual = dict(item.split("=", 1) for item in container.get("Config", {}).get("Env", []) if "=" in item)
        if actual.get("SHOPIFY_STORE_DOMAIN", "").lower() != environment.get("SHOPIFY_STORE_DOMAIN", "").lower():
            fail("running storefront shop differs; check SHOPIFY_STORE_DOMAIN")
        for key in KEYS:
            if actual.get(key):
                running[key].add(actual[key])
    values = {}
    for key in KEYS:
        candidates = {value for value in (environment.get(key), stored.get(key), *running[key]) if value}
        if len(candidates) > 1:
            fail("conflicting " + key + "; existing values preserved, coordinated rotation required")
        value = next(iter(candidates)) if candidates else secrets.token_hex(32)
        if not isinstance(value, str) or len(value) < 32 or (key == KEYS[0] and not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", value)):
            fail("invalid " + key)
        values[key] = value
    if len(set(values.values())) != len(KEYS):
        fail("internal authentication values must be distinct")
    if not args.check:
        if values != stored:
            private_json(path, values)
        os.chmod(path, 0o600)
    private_json(args.output, values)
    print("Internal authentication prepared automatically" + (" (check only; no persistent change)." if args.check else "; existing values preserved."))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    parser.add_argument("--env-file", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        config = json.loads(args.config.read_text())
        if args.check:
            prepare(args, config, root)
        elif os.environ.get("OFFY_DEPLOY_LOCK_HELD") == "1":
            actual, expected = os.fstat(9), (root / ".deploy.lock").stat()
            if (actual.st_dev, actual.st_ino) != (expected.st_dev, expected.st_ino):
                fail("invalid inherited deployment lock")
            prepare(args, config, root)
        else:
            fd = os.open(root / ".deploy.lock", os.O_CREAT | os.O_RDWR, 0o600)
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                prepare(args, config, root)
            finally:
                os.close(fd)
    except ValueError as error:
        # Only fixed reasons and known configuration key names, never JSON/body values.
        reason = str(error) if not isinstance(error, json.JSONDecodeError) else "invalid server-private authentication file"
        print("Internal authentication preparation failed: " + reason, file=sys.stderr)
        return 1
    except (OSError, KeyError, TypeError, subprocess.SubprocessError):
        print("Internal authentication preparation unavailable; check the deployment lock, Docker and private files.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
