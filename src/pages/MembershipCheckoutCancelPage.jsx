import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";

/**
 * /membresias/checkout/cancelado — reached only if the customer backs out
 * of Stripe's hosted Checkout page. No charge was made (Stripe never
 * redirects here after a successful payment) and no subscription was
 * created — nothing to roll back on this side.
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
