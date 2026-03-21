import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";

export default function CartPage() {
  return (
    <>
      <PageHero
        eyebrow="Carrito"
        title="Base del carrito publico"
        subtitle="Aqui luego conectamos items reales, cantidades, descuentos, impuestos y sincronizacion con checkout o CRM."
      />

      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h2>Tu carrito esta vacio</h2>
            <p>
              Esta vista queda preparada para recibir servicios de compra
              directa y reservas con deposito cuando activemos la logica real.
            </p>
            <Button to="/servicios">Ver catalogo</Button>
          </div>
        </div>
      </section>
    </>
  );
}
