#!/usr/bin/env python3
"""Verify local images belong to the exact Git source before a no-build release."""
import json, platform, subprocess, sys
config=json.load(open(sys.argv[1]));revision=sys.argv[2]
if revision == 'unknown': raise SystemExit('Prebuilt release requires an identifiable Git revision')
arch={'x86_64':'amd64','aarch64':'arm64','arm64':'arm64'}.get(platform.machine())
# Tests and cross-host preparation may explicitly validate the production amd64 target.
if platform.system() == 'Darwin': arch='amd64'
for service in sys.argv[3:]:
    image=config['services'][service]['image']
    result=subprocess.run(['docker','image','inspect',image],capture_output=True,text=True)
    if result.returncode: raise SystemExit('Prebuilt image missing for '+service)
    try:
        info=json.loads(result.stdout)[0]
        if info.get('Os')!='linux' or info.get('Architecture')!=arch:
            raise SystemExit('Prebuilt image platform differs from deployment host: '+service)
        if info.get('Config',{}).get('Labels',{}).get('org.opencontainers.image.revision')!=revision:
            raise SystemExit('Prebuilt image revision differs from Git HEAD: '+service)
    except (KeyError,ValueError,IndexError): raise SystemExit('Invalid prebuilt image metadata: '+service)
    print('Prebuilt image verified: '+service+' revision='+revision)
