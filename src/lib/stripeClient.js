import { loadStripe } from "@stripe/stripe-js";

/**
 * Single shared Stripe.js instance — both CheckoutPage.jsx (guest/first
 * checkout) and AccountOrderPaymentPage.jsx (resuming payment on an
 * existing order from "Mis órdenes") mount the same StoreCardPaymentForm
 * against this, so there's exactly one loadStripe() call for the whole app.
 */
export const stripePublishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
).trim();

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
