#!/usr/bin/env python3
"""Write a purpose-separated Flow credential to a private file, never stdout."""
import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        values = json.loads((root / ".offy-runtime-secrets.json").read_text())
        secret = values["KOL_SIGNING_SECRET"]
        if not isinstance(secret, str) or len(secret) < 32:
            raise ValueError()
        token = hmac.new(secret.encode(), b"offy:collabs:flow-attributed:v1", hashlib.sha256).hexdigest()
        path = root / ".offy-runtime-collabs-flow.local"
        # Refuse symlinks. Existing file contents are derived, not a rotated master key.
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "w") as output:
            os.fchmod(output.fileno(), 0o600)
            output.write(token + "\n")
        print("Flow credential prepared in a server-private file; no existing authentication changed.")
    except (OSError, ValueError, KeyError, TypeError):
        parser.exit(1, "Cannot prepare Flow credential; check server-private authentication and file permissions.\n")


if __name__ == "__main__":
    main()
