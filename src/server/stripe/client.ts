import Stripe from "stripe";
import { env } from "../../lib/env";

export function getStripe(): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY ?? "");
}
