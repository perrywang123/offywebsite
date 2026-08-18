import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeEmail } from "@/server/newsletter/subscribe";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string(),
});

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = bodySchema.parse(body).email;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = subscribeEmail(email);

  if (result.ok) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if (result.status === 409) {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }
  return NextResponse.json({ error: "invalid_email" }, { status: 400 });
}
