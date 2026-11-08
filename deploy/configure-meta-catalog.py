#!/usr/bin/env python3
"""Activate audited existing-catalog IDs only; never create products or run a deployment."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import tempfile


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate mapping key")
        result[key] = value
    return result


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", default=str(root / ".env"))
    parser.add_argument("--mapping-file", default=str(root / "config/meta-catalog-ids.json"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    path = Path(args.env_file).resolve()
    mapping = json.loads(Path(args.mapping_file).read_text(), object_pairs_hook=unique_object)
    if not isinstance(mapping, dict) or not mapping or len(mapping) > 10000:
        raise ValueError("Expected a non-empty audited mapping")
    for key, value in mapping.items():
        if not isinstance(key, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,199}", key):
            raise ValueError("Unsupported product code")
        if not isinstance(value, str) or not re.fullmatch(r"[0-9]{5,40}", value):
            raise ValueError("Expected an audited numeric Content ID")
    if len(set(mapping.values())) != len(mapping):
        raise ValueError("Multiple product codes target the same Content ID")
    if not path.is_file():
        raise ValueError("An existing runtime environment file is required")
    if args.check:
        print(f"Catalog configuration valid: {len(mapping)} existing product mappings; no files or services changed.")
        return
    # Share the existing deployment lock. Never source/eval private .env content.
    with (path.parent / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        original = path.read_bytes()
        text = original.decode("utf-8")
        retained = "".join(line for line in text.splitlines(keepends=True)
                           if not re.match(r"\s*(?:export\s+)?META_CATALOG_IDS\s*=", line))
        if retained and not retained.endswith("\n"):
            retained += "\n"
        result = retained + "META_CATALOG_IDS='" + json.dumps(mapping, separators=(",", ":"), sort_keys=True) + "'\n"
        fd, backup = tempfile.mkstemp(prefix=path.name + ".meta-catalog-backup-", suffix=".local", dir=path.parent)
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(original)
        fd, temporary = tempfile.mkstemp(prefix=path.name + ".meta-catalog-env-", suffix=".local", dir=path.parent)
        try:
            with os.fdopen(fd, "w") as stream:
                os.fchmod(stream.fileno(), 0o600)
                stream.write(result)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        print(f"Saved {len(mapping)} audited catalog IDs; other runtime settings preserved. Private backup: {Path(backup).name}. No product, catalog, ad, build or service action performed.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, UnicodeError):
        print("Catalog configuration rejected; check the existing env file, audited mapping and deployment lock. Credentials were not printed.")
        raise SystemExit(1)
