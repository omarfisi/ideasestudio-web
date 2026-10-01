import { loadStripe } from "@stripe/stripe-js";
import { JJ_PEGA_STRIPE_PUBLISHABLE_KEY } from "@/lib/jjPegaRuntime.js";

/**
 * Single shared Stripe.js instance — both CheckoutPage.jsx (guest/first
 * checkout) and AccountOrderPaymentPage.jsx (resuming payment on an
 * existing order from "Mis órdenes") mount the same StoreCardPaymentForm
 * against this, so there's exactly one loadStripe() call for the whole app.
 */
export const stripePublishableKey = (
  JJ_PEGA_STRIPE_PUBLISHABLE_KEY
).trim();

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
