#!/usr/bin/env python3
"""Configure marketing opt-ins in a private .env, preserving other settings and hiding the token."""
import argparse
import getpass
import os
from pathlib import Path
import re
import tempfile

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--pixel-id", default="1120625754196383")
    args = parser.parse_args()
    if not re.fullmatch(r"\d{5,30}", args.pixel_id):
        raise ValueError("Invalid pixel ID")
    path = Path(args.env_file).resolve()
    if not path.is_file():
        raise ValueError("Existing .env required; this command does not create commerce configuration")
    lines = path.read_text().splitlines()
    values = {"META_TRACKING_ENABLED": "true", "META_PIXEL_ID": args.pixel_id, "META_GRAPH_API_VERSION": "v26.0"}
    token = getpass.getpass("Meta CAPI access token (hidden; empty keeps current token): ").strip()
    if token:
        if not re.fullmatch(r"[A-Za-z0-9_.|\-]+", token):
            raise ValueError("Unsupported token characters; no file changed")
        values["META_CAPI_ACCESS_TOKEN"] = token
    token_exists = token or any(re.match(r"\s*META_CAPI_ACCESS_TOKEN\s*=\s*[^\s#]", line) and line.split("=", 1)[1].strip() not in ('""', "''") for line in lines)
    values["META_CAPI_ENABLED"] = "true" if token_exists else "false"
    result = [line for line in lines if not any(re.match(r"\s*(?:export\s+)?" + key + r"\s*=", line) for key in values)]
    result.extend(f"{key}={value}" for key, value in values.items())
    backup = path.with_name(path.name + ".meta-backup.local")
    if not backup.exists():
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as stream:
            stream.write(path.read_text())
    fd, temporary = tempfile.mkstemp(prefix=".meta-env-", suffix=".local", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write("\n".join(result) + "\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("Meta settings saved privately; other configuration preserved. No build, deployment or ad action performed.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError):
        print("Meta configuration could not be saved; check the file, Pixel ID and token format. Credentials were not printed.")
        raise SystemExit(1)
