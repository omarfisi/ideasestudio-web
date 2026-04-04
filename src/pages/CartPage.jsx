import { useEffect, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import {
  getPublicCart,
  getStoredCartSessionToken,
  removePublicCartItem,
  setPublicCartItemQuantity,
} from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [viewState, setViewState] = useState({
    status: "loading",
    message: "",
  });
  const [pendingProductId, setPendingProductId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      const sessionToken = getStoredCartSessionToken();

      if (!sessionToken) {
        if (!cancelled) {
          setCart(null);
          setViewState({ status: "idle", message: "" });
        }
        return;
      }

      try {
        const result = await getPublicCart(sessionToken);

        if (!cancelled) {
          setCart(result);
          setViewState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setCart(null);
          setViewState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el carrito.",
          });
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleQuantityChange(productId, nextQuantity) {
    setPendingProductId(productId);
    setViewState({
      status: "loading",
      message: "Actualizando carrito...",
    });

    try {
      const nextCart = await setPublicCartItemQuantity({
        productId,
        quantity: nextQuantity,
      });

      setCart(nextCart);
      setViewState({
        status: "success",
        message: "Carrito actualizado.",
      });
    } catch (error) {
      setViewState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el carrito.",
      });
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRemove(productId) {
    setPendingProductId(productId);
    setViewState({
      status: "loading",
      message: "Quitando producto del carrito...",
    });

    try {
      const nextCart = await removePublicCartItem({ productId });
      setCart(nextCart);
      setViewState({
        status: "success",
        message: "Producto removido del carrito.",
      });
    } catch (error) {
      setViewState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo remover el producto.",
      });
    } finally {
      setPendingProductId(null);
    }
  }

  const cartIsEmpty = !cart || !cart.items.length;

  return (
    <>
      <PageHero
        eyebrow="Carrito"
        title="Tu carrito dentro de Servicios"
        subtitle="Revisa productos, ajusta cantidades y confirma tu selección antes de continuar al checkout."
      />

      <section className="section">
        <div className="container">
          {viewState.status !== "idle" ? (
            <p className={`form-status form-status--${viewState.status}`}>
              {viewState.message}
            </p>
          ) : null}

          {cartIsEmpty ? (
            <div className="empty-state">
              <h2>Tu carrito está vacío</h2>
              <p>
                Cuando agregues productos desde el catálogo, aquí verás tu
                selección, cantidades y subtotal antes de continuar.
              </p>
              <Button to="/servicios/productos">Ir a productos</Button>
            </div>
          ) : (
            <div className="detail-grid cart-layout">
              <article className="detail-panel cart-panel">
                <h2>Items del carrito</h2>

                <div className="cart-panel__list">
                  {cart.items.map((item) => (
                    <article key={item.id || item.productId} className="cart-item-card">
                      <div
                        className="cart-item-card__media"
                        style={
                          item.product?.coverImage
                            ? {
                                backgroundImage: `linear-gradient(180deg, rgba(12, 12, 12, 0.08) 0%, rgba(12, 12, 12, 0.26) 100%), url(${item.product.coverImage})`,
                              }
                            : undefined
                        }
                      >
                        {!item.product?.coverImage ? (
                          <span>{item.snapshotName}</span>
                        ) : null}
                      </div>

                      <div className="cart-item-card__body">
                        <div className="cart-item-card__copy">
                          <h3>{item.snapshotName}</h3>
                          <p>{item.snapshotDescription}</p>
                        </div>

                        <div className="cart-item-card__meta">
                          <strong>{formatPrice(item.unitPrice, item.currency)}</strong>
                          <span>{item.product?.category?.name || "Catálogo"}</span>
                        </div>

                        <div className="cart-item-card__actions">
                          <div className="cart-quantity-control">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  item.productId,
                                  Math.max(1, item.quantity - 1)
                                )
                              }
                              disabled={pendingProductId === item.productId}
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.productId, item.quantity + 1)
                              }
                              disabled={pendingProductId === item.productId}
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cart-item-card__remove"
                            onClick={() => handleRemove(item.productId)}
                            disabled={pendingProductId === item.productId}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <aside className="detail-summary">
                <div className="summary-row">
                  <span>Líneas</span>
                  <strong>{cart.summary.lineItems}</strong>
                </div>
                <div className="summary-row">
                  <span>Cantidad total</span>
                  <strong>{cart.summary.totalQuantity}</strong>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>
                    {formatPrice(cart.summary.subtotal, cart.summary.currency)}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Estado</span>
                  <strong>Listo para continuar</strong>
                </div>

                <div className="detail-summary__actions">
                  <Button
                    to={`/servicios/checkout?sessionToken=${cart.sessionToken}`}
                    block
                  >
                    Continuar al checkout
                  </Button>
                  <Button to="/servicios/productos" variant="secondary" block>
                    Seguir comprando
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
