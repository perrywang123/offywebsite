// Low-resource, isolated consumer. Never calls Shopify or publishes ads.
const endpoint = process.env.META_WORKER_URL ?? "http://app:3000/api/meta/worker";
const secret = process.env.META_WORKER_SECRET || process.env.KOL_WORKER_SECRET;
if (!secret || secret.length < 32 || !/^https?:\/\//.test(endpoint))
  throw new Error("Meta worker internal authentication required");
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopping = true;
  });
while (!stopping) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) console.error(`Meta worker request failed: ${response.status}`);
  } catch {
    console.error("Meta worker request unavailable");
  }
  await new Promise((resolve) => setTimeout(resolve, 10000));
}
