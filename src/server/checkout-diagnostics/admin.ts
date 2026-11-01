import { z } from "zod";
import { getDb } from "../db/client";
import { requireAdmin, requireMutation } from "../kol/auth";
import { attemptDetail, listAttempts, revealAttempt } from "./store";
import { maintainDiagnostics } from "./runtime";
const cache = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const filters = z.object({
  query: z.string().max(200).optional(),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  status: z.enum(["started", "client_failed", "processing", "failed", "redirect_ready"]).optional(),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
});
export function diagnosticAdminGet(request: Request, path: string[]) {
  const db = getDb();
  requireAdmin(db, request.headers);
  maintainDiagnostics();
  if (path.length === 1)
    return Response.json(
      listAttempts(db, filters.parse(Object.fromEntries(new URL(request.url).searchParams))),
      { headers: cache },
    );
  if (path.length === 2) {
    const data = attemptDetail(db, z.string().uuid().parse(path[1]));
    return Response.json(data ?? { error: "diagnostic_not_found" }, {
      status: data ? 200 : 404,
      headers: cache,
    });
  }
  return Response.json({ error: "not_found" }, { status: 404, headers: cache });
}
export function diagnosticAdminPost(request: Request, path: string[]) {
  requireMutation(request.headers);
  const db = getDb(),
    admin = requireAdmin(db, request.headers);
  if (path.length === 3 && path[2] === "reveal")
    return Response.json(revealAttempt(db, z.string().uuid().parse(path[1]), admin.id), {
      headers: cache,
    });
  return Response.json({ error: "not_found" }, { status: 404, headers: cache });
}
