import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";

/**
 * /membresias/checkout/cancelado — Embedded Checkout migration: this is
 * no longer the normal way a visitor returns from checkout. With
 * ui_mode="embedded" the customer never leaves ideasestudio.com in the
 * first place, so there's no separate hosted page to "back out of," and
 * this route is not linked from anywhere in the embedded flow.
 *
 * Kept only as the cancel_url target for the ui_mode="hosted" rollback
 * path (MEMBERSHIP_CHECKOUT_UI_MODE=hosted) — reached only if the
 * customer backs out of Stripe's hosted Checkout page in that mode. No
 * charge was made (Stripe never redirects here after a successful
 * payment) and no subscription was created — nothing to roll back on
 * this side.
 */
export default function MembershipCheckoutCancelPage() {
  return (
    <>
      <PageHero
        eyebrow="Membresías"
        title="No se realizó ningún cargo"
        subtitle="Cancelaste el proceso de pago. Tu plan no fue activado."
      />
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <Button to="/servicios">Volver a los planes</Button>
          </div>
        </div>
      </section>
    </>
  );
}
