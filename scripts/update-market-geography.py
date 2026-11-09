#!/usr/bin/env python3
"""Regenerate public geographical timezone metadata from a pinned IANA release."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--version", default="2026f")
args = parser.parse_args()
if not re.fullmatch(r"20\d{2}[a-z]", args.version):
    raise SystemExit("Invalid IANA version")
url = f"https://data.iana.org/time-zones/releases/tzdata{args.version}.tar.gz"
with urllib.request.urlopen(url, timeout=30) as response:
    archive = response.read(2_000_000)
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
    read = lambda name: tar.extractfile(name).read().decode("utf-8")
    zones = {}
    for line in read("zone.tab").splitlines():
        if not line or line.startswith("#"):
            continue
        country, _, zone, *_ = line.split("\t")
        zones[zone] = country
    # Geographic zone.tab labels are intentionally preserved. Unlike offset
    # equivalence groups, these map named regions to their ISO territory.
    links = []
    for line in read("backward").splitlines():
        parts = line.split("#", 1)[0].split()
        if parts and parts[0] == "Link":
            links.append((parts[1], parts[2]))
    for _ in range(len(links)):
        added = False
        for target, alias in links:
            if target in zones and alias not in zones:
                zones[alias] = zones[target]
                added = True
        if not added:
            break
    countries = sorted({line.split("\t", 1)[0] for line in read("iso3166.tab").splitlines() if line and not line.startswith("#")} | {"AC", "TA", "XK"})
result = {"version": args.version, "source": url, "sha256": hashlib.sha256(archive).hexdigest(), "countries": countries, "timeZones": dict(sorted(zones.items()))}
root = Path(__file__).resolve().parents[1]
output = root / "src/lib/data/market-geography.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + "\n")
print(f"IANA {args.version}: {len(countries)} territories, {len(zones)} named geographical zones")
