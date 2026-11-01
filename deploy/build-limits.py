#!/usr/bin/env python3
"""Prepare and verify an isolated, CPU-capped Docker image builder."""
import argparse
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys


class BuildLimitError(Exception):
    pass


def need(ok, reason):
    if not ok:
        raise BuildLimitError("Build CPU isolation failed: " + reason)


def docker(*args, allow_missing=False, timeout=30):
    result = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=timeout)
    if allow_missing and result.returncode and "no builder" in result.stderr.lower() and "found" in result.stderr.lower():
        return None
    if result.returncode:
        reason = "check Docker/Buildx access and connectivity"
        for fragment, description in (("connection refused", "network connection refused while preparing the builder"), ("no such host", "DNS resolution failed"), ("i/o timeout", "network request timed out"), ("unauthorized", "registry authorization failed"), ("no space left", "Docker storage has insufficient free space")):
            if fragment in result.stderr.lower():
                reason = description
                break
        need(False, "Docker " + " ".join(args[:2]) + " failed: " + reason)
    return result.stdout


def cpu_budget(config):
    value = str(config.get("x-offy-deploy", {}).get("build_cpus", "1")).strip()
    need(re.fullmatch(r"(?:0|[1-9]\d?)(?:\.\d{1,2})?", value) is not None, "DEPLOY_BUILD_CPUS must be a number from 0.1 to 64 (at most two decimals)")
    cpus = Decimal(value)
    need(Decimal("0.1") <= cpus <= Decimal("64"), "DEPLOY_BUILD_CPUS must be between 0.1 and 64")
    return format(cpus.normalize(), "f"), int(cpus * 100000)


def declared_builder(raw, name, quota):
    need(re.search(r"^Driver:\s+docker-container\s*$", raw, re.M), "dedicated builder driver differs; existing builder/cache preserved")
    names = re.findall(r"^Name:\s+(\S+)\s*$", raw, re.M)
    need(names == [name, name + "0"], "dedicated builder must have exactly its expected local node")
    line = re.search(r"^Driver Options:\s*(.*)$", raw, re.M)
    opts = dict(re.findall(r'([\w.-]+)="([^"]*)"', line.group(1) if line else ""))
    for key, expected in (("cpu-period", "100000"), ("cpu-quota", str(quota)), ("default-load", "true")):
        need(opts.get(key) == expected, "dedicated builder " + key + " differs; no unrestricted fallback")


def actual_builder(container, quota):
    data = json.loads(docker("inspect", container))
    need(isinstance(data, list) and len(data) == 1, "builder container unavailable")
    need(data[0].get("State", {}).get("Running") is True, "builder container is not running")
    host = {key.lower(): value for key, value in data[0].get("HostConfig", {}).items()}
    need(host.get("cpuperiod") == 100000 and host.get("cpuquota") == quota, "actual builder container CPU quota/period differs; build refused")
    content = docker("exec", container, "cat", "/etc/buildkit/buildkitd.toml")
    section = re.search(r"^\s*\[worker\.oci\][ \t]*\n(.*?)(?=^\s*\[|\Z)", content, re.M | re.S)
    need(section and re.search(r"^\s*max-parallelism\s*=\s*1\s*(?:#.*)?$", section.group(1), re.M), "actual BuildKit OCI parallelism must be one")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        cpus, quota = cpu_budget(json.loads(args.config.read_text()))
        version = re.search(r"\bv(\d+)\.(\d+)\.(\d+)", docker("buildx", "version"))
        need(version and tuple(map(int, version.groups())) >= (0, 14, 0), "Docker Buildx >= 0.14.0 is required for automatic local image loading")
        need("--builder" in docker("compose", "build", "--help"), "Docker Compose build must support --builder")
        info = {key.lower(): value for key, value in json.loads(docker("info", "--format", "{{json .}}")).items()}
        need(info.get("cpucfsquota") is True and info.get("cpucfsperiod") is True, "Docker engine/kernel does not report CPU CFS quota and period support")
        root = args.root.resolve()
        config_file = root / "deploy/buildkitd.toml"
        context = docker("context", "show").strip()
        identity = json.dumps([str(root), context, os.environ.get("DOCKER_HOST", ""), quota, hashlib.sha256(config_file.read_bytes()).hexdigest()])
        name = "offy-build-" + hashlib.sha256(identity.encode()).hexdigest()[:16]
        container = "buildx_buildkit_" + name + "0"
        current = docker("buildx", "inspect", name, allow_missing=True)
        if current is not None:
            declared_builder(current, name, quota)
        if not args.check:
            if current is None:
                print("Preparing dedicated BuildKit builder; first use may download the official BuildKit image.", flush=True)
                docker("buildx", "create", "--name", name, "--driver", "docker-container", "--driver-opt", "cpu-period=100000", "--driver-opt", "cpu-quota=" + str(quota), "--driver-opt", "default-load=true", "--buildkitd-config", str(config_file))
            raw = docker("buildx", "inspect", "--bootstrap", name, timeout=300)
            declared_builder(raw, name, quota)
            actual_builder(container, quota)
        result = {"name": name, "container": container, "cpus": cpus, "period": 100000, "quota": quota}
        fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as stream:
            os.fchmod(stream.fileno(), 0o600)
            json.dump(result, stream)
        print("Build CPU " + ("preflight passed" if args.check else "isolation verified") + ": " + cpus + " CPU shared by all build tasks; builder=" + name + (" (check only; no builder changes)" if args.check else ""))
        return 0
    except BuildLimitError as error:
        print(str(error), file=sys.stderr)
    except (OSError, ValueError, TypeError, subprocess.SubprocessError):
        print("Build CPU isolation unavailable: check Docker/Buildx, deployment files and builder startup.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
