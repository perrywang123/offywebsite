/**
 * 零依赖 CDP(Chrome DevTools Protocol)小客户端 —— 只够移动端尺寸审计用。
 *
 * 为什么手写而不是装 puppeteer:本仓库的依赖是生产依赖 + 少量 devDeps,
 * 为了一个一次性验收脚本再拖进一个几百 MB 的浏览器驱动不划算。Node 22+ 自带
 * 全局 `WebSocket`,CDP 又只是一层 JSON-RPC,所以这里只做三件事:
 *   1. 找到一个可用的 DevTools HTTP 端点(优先连已有的,否则自己拉起本地 Chrome);
 *   2. 开一个页签并连上它的 WebSocket;
 *   3. `send(method, params)` + `evaluate(expression)`。
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "google-chrome",
  "chromium",
  "chromium-browser",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 轮询 `http://127.0.0.1:<port>/json/version`,返回 webSocketDebuggerUrl。 */
async function waitForEndpoint(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw new Error(`DevTools 端点 127.0.0.1:${port} 在 ${timeoutMs}ms 内没起来: ${lastError}`);
}

/**
 * 拿到一个可用的浏览器:
 *  · `opts.port` 指到已经在跑的 Chrome(`--remote-debugging-port`)就用它;
 *  · 否则自己拉起一个 headless Chrome(临时 profile,退出时删除)。
 */
export async function launchBrowser({ port, timeoutMs = 20000 } = {}) {
  if (port) {
    const version = await waitForEndpoint(port, timeoutMs);
    return { port, version, close: async () => {} };
  }

  const profileDir = mkdtempSync(join(tmpdir(), "offy-cdp-"));
  let lastError;
  for (const bin of CHROME_CANDIDATES) {
    const debugPort = 9000 + Math.floor(Math.random() * 1000);
    const child = spawn(
      bin,
      [
        "--headless=new",
        // 受限环境(容器 / 沙箱化的 CI / 本机 DSH 沙箱)里 Chrome 的沙箱初始化会
        // 失败,表现是 version 端点能连上、但一开新页签渲染进程就崩(WS 1006)。
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        `--remote-debugging-port=${debugPort}`,
        // Chrome 111+ 会拒绝 Origin 不在白名单里的 DevTools WebSocket 客户端
        // (Node 自带的 WebSocket 不给我们改 header 的机会,实测握手成功但立刻
        // 以 1006 断开),所以必须显式放开。
        "--remote-allow-origins=*",
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    try {
      const version = await waitForEndpoint(debugPort, timeoutMs);
      const close = async () => {
        child.kill("SIGKILL");
        try {
          rmSync(profileDir, { recursive: true, force: true });
        } catch {
          /* 临时目录清不掉不影响结果 */
        }
      };
      return { port: debugPort, version, close };
    } catch (error) {
      lastError = error;
      child.kill("SIGKILL");
    }
  }
  rmSync(profileDir, { recursive: true, force: true });
  throw new Error(
    `找不到可用的 Chrome/Chromium(可用 CHROME_PATH 指定): ${lastError?.message ?? ""}`,
  );
}

/** 打开一个空白页签并连上它,返回一个极简 CDP 会话。 */
export async function openPage(port) {
  // Chrome 111+ 要求 PUT;/json/new 在旧版本上是 GET,这里按 PUT 走并在失败时回退。
  let target;
  for (const method of ["PUT", "GET"]) {
    const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method });
    if (res.ok) {
      target = await res.json();
      break;
    }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error("无法新建页签(/json/new 失败)");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const onError = () => reject(new Error("CDP WebSocket 连接失败(连已有 Chrome 时需要 --remote-allow-origins=*)"));
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", onError, { once: true });
    ws.addEventListener(
      "close",
      (event) => reject(new Error(`CDP WebSocket 在握手阶段被关闭: ${event.code}`)),
      { once: true },
    );
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? {})})`));
      else resolve(msg.result);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`页面脚本抛错: ${result.exceptionDetails.text}`);
    }
    return result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  /** 设定移动端视口(含 DPR / 触屏),这是所有断言的基准。 */
  const setViewport = (width, height) =>
    Promise.all([
      send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 3,
        mobile: true,
      }),
      send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }),
    ]);

  /** 导航到 url 并等到 DOM 就绪(再给一点时间让字体/图片/首屏 JS 落定)。 */
  const goto = async (url, settleMs = 900) => {
    await send("Page.navigate", { url });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      try {
        const state = await evaluate("document.readyState");
        if (state === "complete") break;
      } catch {
        /* 导航途中 evaluate 会失败,继续等 */
      }
      await sleep(120);
    }
    await sleep(settleMs);
  };

  const close = async () => {
    try {
      await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`, { method: "PUT" });
    } catch {
      /* 关不掉也不影响 */
    }
    ws.close();
  };

  return { send, evaluate, setViewport, goto, close, targetId: target.id };
}
