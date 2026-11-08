export async function deliver(
  payload: unknown,
  config: { endpoint: string; token: string; testCode?: string },
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; retryable?: boolean; error?: string }> {
  try {
    const response = await fetcher(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
      body: JSON.stringify({
        data: [payload],
        ...(config.testCode ? { test_event_code: config.testCode } : {}),
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok)
      return {
        ok: false,
        retryable: response.status === 429 || response.status >= 500,
        error: `http_${response.status}`,
      };
    const body = await response.json();
    return body?.events_received === 1 && !body.error
      ? { ok: true }
      : { ok: false, retryable: false, error: "meta_rejected" };
  } catch {
    return { ok: false, retryable: true, error: "transport_unavailable" };
  }
}
