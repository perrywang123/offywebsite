#!/usr/bin/env python3
"""Start/stop the optional Meta consumer, without building or restarting the storefront."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

def read(command):
    return subprocess.check_output(command, text=True, stderr=subprocess.DEVNULL).strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "stop", "status", "check"))
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    command = ["docker", "compose", "--env-file", str((root / args.env_file).resolve()), "-f", str(root / "docker-compose.prod.yml"), "--profile", "meta"]
    if args.action in ("stop", "status"):
        return subprocess.call(command + (["stop", "meta-worker"] if args.action == "stop" else ["ps", "meta-worker"]), cwd=root)
    ids = read(command + ["ps", "-q", "app"]).split()
    if len(ids) != 1:
        raise ValueError("Exactly one running storefront is required; no services changed.")
    container = json.loads(read(["docker", "inspect", ids[0]]))[0]
    values = dict(v.split("=", 1) for v in container["Config"]["Env"] if "=" in v)
    secret = values.get("META_WORKER_SECRET") or values.get("KOL_WORKER_SECRET")
    if container.get("State", {}).get("Health", {}).get("Status") != "healthy":
        raise ValueError("Storefront must already be healthy; no services changed.")
    if values.get("META_TRACKING_ENABLED") != "true" or values.get("META_CAPI_ENABLED") != "true" or not values.get("META_CAPI_ACCESS_TOKEN") or not secret or len(secret) < 32:
        raise ValueError("Storefront Meta configuration incomplete; check feature flags, access token and internal worker authentication. No services changed.")
    if args.action == "check":
        print("Meta worker configuration ready; no services changed.")
        return 0
    # Pin to the image already RUNNING in app, rather than a moving/unbuilt tag.
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as override:
        json.dump({"services": {"meta-worker": {"image": container["Image"]}}}, override)
        override.flush()
        child_env = {**os.environ, "META_WORKER_SECRET": secret}
        result = subprocess.call(command + ["-f", override.name, "up", "-d", "--no-build", "--no-deps", "meta-worker"], cwd=root, env=child_env)
    if result == 0:
        print("Meta worker started from the running storefront image; storefront/admin were not restarted.")
    return result

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, IndexError, OSError, subprocess.SubprocessError) as error:
        print(str(error) if isinstance(error, ValueError) else "Meta worker command unavailable; check Docker and the existing storefront. Credentials were not printed.")
        raise SystemExit(1)
