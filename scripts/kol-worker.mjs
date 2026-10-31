// Dedicated durable-queue consumer. All state/leases/retries live in the application DB.
const endpoint = process.env.KOL_WORKER_URL ?? "http://app:3000/api/kol/worker";
if (!process.env.KOL_WORKER_SECRET || !/^https?:\/\//.test(endpoint))
  throw new Error("Worker URL/secret required");
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.KOL_WORKER_SECRET}` },
      signal: AbortSignal.timeout(110000),
    });
    if (!result.ok) console.error(`KOL worker request failed: ${result.status}`);
  } catch {
    console.error("KOL worker request unavailable");
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
