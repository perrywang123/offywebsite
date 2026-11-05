/** Server-only Admin authentication. Credentials/tokens never leave this process. */
export interface AdminClientConfig {
  shop?: string;
  origin: string;
  apiVersion: string;
  manualToken?: string;
  clientId?: string;
  clientSecret?: string;
  // Caller must enforce the existing non-production, loopback-only integration gate.
  allowLoopback?: boolean;
}
export function adminAuthMode(
  config: Pick<AdminClientConfig, "shop" | "manualToken" | "clientId" | "clientSecret">,
) {
  const id = config.clientId?.trim(),
    secret = config.clientSecret?.trim();
  if (Boolean(id) !== Boolean(secret)) return "incomplete";
  if (!config.shop?.trim()) return "unconfigured";
  if (id && secret) return "automatic";
  return config.manualToken?.trim() ? "manual" : "unconfigured";
}
interface CachedToken {
  token: string;
  expiresAt: number;
  renewAt: number;
}
interface TokenState {
  key: string;
  cached?: CachedToken;
  pending?: Promise<string>;
  retryAt: number;
  error?: Error;
}
function safeOrigin(config: AdminClientConfig) {
  try {
    const u = new URL(config.origin);
    const loopback = config.allowLoopback && ["127.0.0.1", "localhost"].includes(u.hostname);
    const shop = config.shop?.trim().toLowerCase() ?? "";
    if (
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/" ||
      (!(loopback && ["http:", "https:"].includes(u.protocol)) &&
        !(
          u.protocol === "https:" &&
          !u.port &&
          u.hostname === shop &&
          /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
        ))
    )
      throw new Error();
    return u.origin;
  } catch {
    throw new Error("shopify_admin_auth_unsafe_origin");
  }
}

/** Factory keeps clock/network controllable in tests; production uses one module singleton. */
export function createAdminClient(readConfig: () => AdminClientConfig, now = Date.now) {
  let state: TokenState | undefined;
  async function token(config: AdminClientConfig, fetchImpl: typeof fetch, rejected?: string) {
    const origin = safeOrigin(config);
    const key = JSON.stringify([origin, config.clientId?.trim(), config.clientSecret?.trim()]);
    if (state?.key !== key) state = { key, retryAt: 0 };
    const current = state;
    if (rejected && current.cached?.token === rejected) current.cached = undefined;
    if (current.cached && now() < current.cached.renewAt) return current.cached.token;
    if (current.pending) return current.pending;
    if (now() < current.retryAt) {
      if (current.cached && now() < current.cached.expiresAt) return current.cached.token;
      throw current.error!;
    }
    current.pending = Promise.resolve().then(async () => {
      try {
        const started = now();
        let response: Response;
        try {
          response = await fetchImpl(`${origin}/admin/oauth/access_token`, {
            method: "POST",
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: config.clientId!.trim(),
              client_secret: config.clientSecret!.trim(),
            }).toString(),
          });
        } catch {
          throw new Error("shopify_admin_auth_network_error");
        }
        if (!response.ok) throw new Error(`shopify_admin_auth_http_${response.status}`);
        let body;
        try {
          body = await response.json();
        } catch {
          throw new Error("shopify_admin_auth_invalid_response");
        }
        const ttl = body?.expires_in;
        const expiresAt = started + ttl * 1000;
        if (
          typeof body?.access_token !== "string" ||
          !body.access_token.trim() ||
          typeof ttl !== "number" ||
          !Number.isFinite(ttl) ||
          ttl <= 0 ||
          !Number.isFinite(expiresAt) ||
          expiresAt <= now()
        )
          throw new Error("shopify_admin_auth_invalid_response");
        current.cached = {
          token: body.access_token,
          expiresAt,
          renewAt: expiresAt - Math.min(300000, ttl * 100),
        };
        current.error = undefined;
        current.retryAt = 0;
        return current.cached.token;
      } catch (error) {
        // Only fixed messages created above reach callers, worker logs or the management API.
        current.error = error as Error;
        current.retryAt = now() + 30000;
        if (current.cached && now() < current.cached.expiresAt) return current.cached.token;
        throw error;
      } finally {
        current.pending = undefined;
      }
    });
    return current.pending;
  }
  return {
    async request<T>(
      query: string,
      variables: Record<string, unknown> = {},
      fetchImpl: typeof fetch = fetch,
    ): Promise<T> {
      const config = readConfig(),
        mode = adminAuthMode(config);
      if (mode === "incomplete") throw new Error("shopify_admin_credentials_incomplete");
      if (mode === "unconfigured") throw new Error("shopify_admin_not_configured");
      let accessToken =
        mode === "automatic" ? await token(config, fetchImpl) : config.manualToken!.trim();
      const send = async () => {
        try {
          return await fetchImpl(`${config.origin}/admin/api/${config.apiVersion}/graphql.json`, {
            method: "POST",
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
            body: JSON.stringify({ query, variables }),
          });
        } catch {
          throw new Error("shopify_admin_network_error");
        }
      };
      let response = await send();
      if (response.status === 401 && mode === "automatic") {
        accessToken = await token(config, fetchImpl, accessToken);
        response = await send();
        if (response.status === 401 && state?.cached?.token === accessToken) {
          state.cached = undefined;
          state.error = new Error("shopify_admin_http_401");
          state.retryAt = now() + 30000;
        }
      }
      if (!response.ok) throw new Error(`shopify_admin_http_${response.status}`);
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error("shopify_admin_invalid_response");
      }
      if (body?.errors?.length) throw new Error("shopify_admin_graphql_error");
      if (!body?.data) throw new Error("shopify_admin_empty");
      return body.data as T;
    },
  };
}
