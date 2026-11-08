"""Isolated configuration/consumer checks; no Docker or real credentials used."""
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import runpy
import sys
import tempfile
from unittest.mock import patch

configure = runpy.run_path("deploy/configure-meta.py", run_name="meta_config_test")["main"]
consumer = runpy.run_path("deploy/meta-worker.py", run_name="meta_worker_test")["main"]
with tempfile.TemporaryDirectory(prefix="offy-meta-config-test-") as directory:
    path = Path(directory) / ".env"
    path.write_text("SITE_URL=https://isoffy.com\nSHOPIFY_STOREFRONT_TOKEN=local-dummy\n")
    output = io.StringIO()
    with patch.object(sys, "argv", ["configure-meta.py", "--env-file", str(path)]), patch("getpass.getpass", return_value="local-dummy-meta-token"), redirect_stdout(output):
        configure()
    assert "local-dummy-meta-token" not in output.getvalue()
    assert "SHOPIFY_STOREFRONT_TOKEN=local-dummy" in path.read_text()
    assert "META_CAPI_ENABLED=true" in path.read_text()
    assert path.stat().st_mode & 0o777 == 0o600
    assert path.with_name(".env.meta-backup.local").stat().st_mode & 0o777 == 0o600
    with patch.object(sys, "argv", ["configure-meta.py", "--env-file", str(path)]), patch("getpass.getpass", return_value=""), redirect_stdout(io.StringIO()):
        configure()
    assert path.read_text().count("META_CAPI_ACCESS_TOKEN=") == 1
    assert "META_CAPI_ACCESS_TOKEN=local-dummy-meta-token" in path.read_text()
    before = path.read_text()
    with patch.object(sys, "argv", ["configure-meta.py", "--env-file", str(path)]), patch("getpass.getpass", return_value="invalid$token"):
        try:
            configure()
            raise AssertionError("unsafe input accepted")
        except ValueError:
            pass
    assert path.read_text() == before

fake_secret = "local-only-worker-secret-000000000000"
container = {"Image": "sha256:local-image", "State": {"Health": {"Status": "healthy"}}, "Config": {"Env": ["META_TRACKING_ENABLED=true", "META_CAPI_ENABLED=true", "META_CAPI_ACCESS_TOKEN=local-token", "KOL_WORKER_SECRET=" + fake_secret]}}
def read(command, **kwargs):
    return json.dumps([container]) if command[:2] == ["docker", "inspect"] else "local-app-id"
calls = []
def execute(command, **kwargs):
    assert "--no-build" in command and "--no-deps" in command and command[-1] == "meta-worker"
    assert kwargs["env"]["META_WORKER_SECRET"] == fake_secret
    override = Path(command[command.index("up") - 1])
    assert json.loads(override.read_text())["services"]["meta-worker"]["image"] == container["Image"]
    calls.append(command)
    return 0
with patch.object(sys, "argv", ["meta-worker.py", "check"]), patch("subprocess.check_output", side_effect=read), patch("subprocess.call", side_effect=execute), redirect_stdout(io.StringIO()):
    assert consumer() == 0
assert not calls
with patch.object(sys, "argv", ["meta-worker.py", "start"]), patch("subprocess.check_output", side_effect=read), patch("subprocess.call", side_effect=execute), redirect_stdout(io.StringIO()):
    assert consumer() == 0
assert len(calls) == 1
print("Meta private configuration, preservation, image pinning and no-build/no-deps checks passed.")
