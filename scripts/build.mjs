// Keep lint and Next.js type checking in separate processes/phases on small hosts.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { constants } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function memoryObservation() {
  for (const path of [
    "/sys/fs/cgroup/memory.current",
    "/sys/fs/cgroup/memory/memory.usage_in_bytes",
  ]) {
    try {
      const bytes = Number(readFileSync(path, "utf8").trim());
      if (Number.isFinite(bytes)) return `cgroup_memory_mib=${(bytes / 1048576).toFixed(1)}`;
    } catch {}
  }
  return "cgroup_memory_mib=unavailable";
}

function log(message) {
  console.log(`[offy-build ${new Date().toISOString()}] ${message}`);
}

function signalExit(signal) {
  return 128 + (constants.signals[signal] || 1);
}

export async function runBuild({ heartbeatMs = 30000 } = {}) {
  const phases = [
    { name: "lint", args: ["lint"] },
    { name: "next-build", args: ["exec", "next", "build", "--turbopack", "--no-lint"] },
  ];
  let child;
  let current;
  let interrupted;
  const handlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    const handler = () => {
      if (interrupted) return;
      interrupted = signal;
      log(`phase=${current || "pending"} status=canceled signal=${signal}`);
      if (child?.pid) {
        try {
          if (process.platform === "win32") child.kill(signal);
          else process.kill(-child.pid, signal);
        } catch {}
      }
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }
  try {
    for (const phase of phases) {
      if (interrupted) return signalExit(interrupted);
      current = phase.name;
      const started = performance.now();
      const elapsed = () => `${((performance.now() - started) / 1000).toFixed(1)}s`;
      log(`phase=${current} status=start ${memoryObservation()}`);
      child = spawn("pnpm", phase.args, {
        stdio: "inherit",
        detached: process.platform !== "win32",
      });
      const timer = setInterval(() => {
        log(`phase=${current} status=running elapsed=${elapsed()} ${memoryObservation()}`);
      }, heartbeatMs);
      const result = await new Promise((resolveResult) => {
        child.once("error", () => resolveResult({ code: 127, signal: null }));
        child.once("close", (code, signal) =>
          resolveResult({ code: code ?? (signal ? signalExit(signal) : 1), signal }),
        );
      });
      clearInterval(timer);
      child = undefined;
      const code = interrupted ? signalExit(interrupted) : result.code;
      log(
        `phase=${current} status=${code === 0 ? "success" : "failed"} elapsed=${elapsed()} exit=${code}${result.signal ? ` signal=${result.signal}` : ""} ${memoryObservation()}`,
      );
      if (code !== 0) return code;
    }
    log("status=success lint=passed next_typecheck=enabled");
    return 0;
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runBuild();
}
