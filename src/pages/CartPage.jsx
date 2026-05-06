import { useEffect, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import {
  getPublicCart,
  getStoredCartSessionToken,
  removePublicCartItem,
  setPublicCartItemQuantity,
  validateStoreCoupon,
} from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";

function syncSelectedProductIds(nextCart, currentSelectedIds = []) {
  const nextItems = Array.isArray(nextCart?.items) ? nextCart.items : [];
  const nextIds = nextItems
    .map((item) => String(item.productId || ""))
    .filter(Boolean);

  if (!nextIds.length) {
    return [];
  }

  if (!currentSelectedIds.length) {
    return nextIds;
  }

  const selectedSet = new Set(currentSelectedIds);
  const kept = nextIds.filter((id) => selectedSet.has(id));
  return kept.length ? kept : nextIds;
}

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [viewState, setViewState] = useState({
    status: "loading",
    message: "",
  });
  const [pendingProductId, setPendingProductId] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState({ status: "idle", message: "" });
  const [appliedCoupon, setAppliedCoupon] = useState(null);

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
          setSelectedProductIds(syncSelectedProductIds(result, []));
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
      setSelectedProductIds((current) =>
        syncSelectedProductIds(nextCart, current)
      );
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
      message: "Quitando servicio del resumen...",
    });

    try {
      const nextCart = await removePublicCartItem({ productId });
      setCart(nextCart);
      setSelectedProductIds((current) =>
        syncSelectedProductIds(nextCart, current)
      );
      setViewState({
        status: "success",
        message: "Servicio removido del resumen.",
      });
    } catch (error) {
      setViewState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo remover el servicio.",
      });
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRemoveSelected() {
    if (!cart?.items?.length || !selectedProductIds.length) {
      return;
    }

    setViewState({
      status: "loading",
      message: "Eliminando servicios seleccionados...",
    });

    try {
      for (const productId of selectedProductIds) {
        // Sequential update keeps cart state consistent between operations.
        // eslint-disable-next-line no-await-in-loop
        await removePublicCartItem({ productId });
      }

      const nextCart = await getPublicCart(getStoredCartSessionToken());
      setCart(nextCart);
      setSelectedProductIds(syncSelectedProductIds(nextCart, []));
      setViewState({
        status: "success",
        message: "Servicios eliminados del resumen.",
      });
    } catch (error) {
      setViewState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron eliminar los servicios seleccionados.",
      });
    } finally {
      setPendingProductId(null);
    }
  }

  function toggleSelectAll(checked) {
    if (!cart?.items?.length) {
      setSelectedProductIds([]);
      return;
    }
    if (!checked) {
      setSelectedProductIds([]);
      return;
    }
    setSelectedProductIds(
      cart.items
        .map((item) => String(item.productId || ""))
        .filter(Boolean)
    );
  }

  function toggleProductSelection(productId) {
    const key = String(productId || "");
    if (!key) return;

    setSelectedProductIds((current) => {
      if (current.includes(key)) {
        return current.filter((id) => id !== key);
      }
      return [...current, key];
    });
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponState({ status: "loading", message: "" });
    try {
      const subtotal = Number(cart?.summary?.subtotal || 0);
      const result = await validateStoreCoupon({ code, orderAmount: subtotal, currency: cart?.summary?.currency || "USD" });
      setAppliedCoupon({ code, discountAmount: result.discount_amount });
      setCouponState({ status: "success", message: `Cupón aplicado: -${formatPrice(result.discount_amount, cart?.summary?.currency || "USD")}` });
    } catch (error) {
      setAppliedCoupon(null);
      const detail = error?.message || "Cupón inválido.";
      const msgMap = {
        coupon_not_found: "El código de cupón no existe.",
        coupon_inactive: "Este cupón no está activo.",
        coupon_expired: "Este cupón expiró.",
        coupon_usage_limit_reached: "Este cupón alcanzó su límite de usos.",
        coupon_min_order_not_met: "El monto mínimo para este cupón no se ha alcanzado.",
      };
      setCouponState({ status: "error", message: msgMap[detail] || detail });
    }
  }

  const cartIsEmpty = !cart || !cart.items.length;
  const cartQuantity = Number(cart?.summary?.totalQuantity || 0);
  const cartSubtotal = Number(cart?.summary?.subtotal || 0);
  const allSelected =
    !!cart?.items?.length && selectedProductIds.length === cart.items.length;
  const checkoutHref = cart?.sessionToken
    ? `/servicios/checkout?sessionToken=${cart.sessionToken}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`
    : "/servicios/checkout";
  const cartSubtotalAfterDiscount = appliedCoupon
    ? Math.max(0, cartSubtotal - appliedCoupon.discountAmount)
    : cartSubtotal;

  return (
    <>
      <section className="section cart-checkout-page">
        <div className="container">
          <header className="cart-checkout-header">
            <h1>Tu carrito de compra</h1>
            <ol className="cart-checkout-steps" aria-label="Progreso de compra">
              <li className="is-active">
                <span>1</span>
                <strong>Carrito</strong>
              </li>
              <li>
                <span>2</span>
                <strong>Datos de checkout</strong>
              </li>
              <li>
                <span>3</span>
                <strong>Orden completada</strong>
              </li>
            </ol>
          </header>

          {viewState.status !== "idle" ? (
            <p className={`form-status form-status--${viewState.status}`}>
              {viewState.message}
            </p>
          ) : null}

          {cartIsEmpty ? (
            <div className="empty-state">
              <h2>Tu resumen está vacío</h2>
              <p>
                Cuando agregues servicios desde el catálogo, aquí verás tu
                selección, cantidades y subtotal antes de continuar.
              </p>
              <Button to="/servicios">Ir a servicios</Button>
            </div>
          ) : (
            <div className="cart-checkout-shell">
              <article className="cart-checkout-list-panel">
                <header className="cart-checkout-list-panel__head">
                  <h2>Tu carrito</h2>
                </header>

                <div className="cart-checkout-toolbar">
                  <label className="cart-checkout-toolbar__check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                    <span>Seleccionar todo</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    disabled={!selectedProductIds.length}
                  >
                    Eliminar
                  </button>
                </div>

                <div className="cart-checkout-list">
                  {cart.items.map((item) => (
                    <article key={item.id || item.productId} className="cart-checkout-item">
                      <label className="cart-checkout-item__selector">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(
                            String(item.productId || "")
                          )}
                          onChange={() => toggleProductSelection(item.productId)}
                        />
                      </label>

                      <div
                        className="cart-checkout-item__media"
                        style={
                          item.product?.coverImage
                            ? {
                                backgroundImage: `url(${item.product.coverImage})`,
                              }
                            : undefined
                        }
                      >
                        {!item.product?.coverImage ? (
                          <span>{item.snapshotName}</span>
                        ) : null}
                      </div>

                      <div className="cart-checkout-item__body">
                        <div className="cart-checkout-item__copy">
                          <h3>{item.snapshotName}</h3>
                          <p>{item.snapshotDescription || "Servicio profesional"}</p>
                        </div>

                        <div className="cart-checkout-item__meta">
                          <strong>{formatPrice(item.unitPrice, item.currency)}</strong>
                          <span>{item.product?.category?.name || "Catálogo"}</span>
                        </div>

                        <div className="cart-checkout-item__actions">
                          <div className="cart-checkout-qty">
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
                            className="cart-checkout-item__remove"
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

              <aside className="cart-checkout-summary">
                <h2>Resumen de orden</h2>
                <div className="cart-checkout-summary__coupon">
                  <input
                    type="text"
                    placeholder="Código de cupón"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (appliedCoupon) setAppliedCoupon(null);
                      if (couponState.status !== "idle") setCouponState({ status: "idle", message: "" });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                    disabled={couponState.status === "loading"}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponState.status === "loading" || !couponCode.trim()}
                  >
                    {couponState.status === "loading" ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponState.status !== "idle" && (
                  <p style={{ margin: "4px 0 8px", fontSize: "0.8rem", color: couponState.status === "success" ? "#16a34a" : "#dc2626" }}>
                    {couponState.message}
                  </p>
                )}
                <div className="summary-row">
                  <span>Servicios</span>
                  <strong>{Number(cart?.summary?.lineItems || 0)}</strong>
                </div>
                <div className="summary-row">
                  <span>Cantidad total</span>
                  <strong>{cartQuantity}</strong>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>
                    {formatPrice(cartSubtotal, cart.summary.currency)}
                  </strong>
                </div>
                {appliedCoupon && (
                  <div className="summary-row" style={{ color: "#16a34a" }}>
                    <span>Descuento ({appliedCoupon.code})</span>
                    <strong>-{formatPrice(appliedCoupon.discountAmount, cart.summary.currency)}</strong>
                  </div>
                )}
                <div className="summary-row">
                  <span>Costo de entrega</span>
                  <strong>{formatPrice(0, cart.summary.currency)}</strong>
                </div>
                <div className="summary-row summary-row--total">
                  <span>Total</span>
                  <strong>
                    {formatPrice(cartSubtotalAfterDiscount, cart.summary.currency)}
                  </strong>
                </div>

                <div className="cart-checkout-summary__actions">
                  <Button
                    to={checkoutHref}
                    block
                    className="cart-checkout-summary__cta"
                  >
                    Ir al checkout
                  </Button>
                  <Button to="/servicios" variant="secondary" block>
                    Seguir contratando
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
