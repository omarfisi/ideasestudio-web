import {
  createBrowserRouter,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout.jsx";
import {
  getPublicProductBySlug,
  getPublicOrderByNumber,
} from "@/lib/api.js";
import JJPegaHomePage from "@/pages/JJPegaHomePage.jsx";
import JJPersonalizePage from "@/pages/JJPersonalizePage.jsx";
import StorePage from "@/pages/StorePage.jsx";
import ProductDetailPage from "@/pages/ProductDetailPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import CartPage from "@/pages/CartPage.jsx";
import CheckoutPage from "@/pages/CheckoutPage.jsx";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage.jsx";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
const IS_JJ_PEGA = true;
import RouteErrorPage from "@/pages/RouteErrorPage.jsx";
import LegalPage from "@/pages/LegalPage.jsx";
import ComingSoonPage from "@/pages/ComingSoonPage.jsx";
import StickerIndividualsPage from "@/pages/StickerIndividualsPage.jsx";
import StickerPacksPage from "@/pages/StickerPacksPage.jsx";

const loadProductsCatalog = ({ request }) => {
  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get("category") || "all",
    productType: "physical",
    search: url.searchParams.get("q") || "",
  };

  return { filters };
};

const loadProductDetail = async ({ params }) => {
  try {
    const product = await getPublicProductBySlug(params.slug);
    const expectedType = IS_JJ_PEGA ? "physical" : "service";
    if (!product || product.productType !== expectedType || !product.isActive) {
      return { product: null };
    }

    return {
      product,
    };
  } catch (error) {
    return {
      product: null,
    };
  }
};

function RedirectWithLocation({ to }) {
  const location = useLocation();

  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}

function RedirectLegacyStoreProduct() {
  const location = useLocation();
  const { slug } = useParams();

  return (
    <Navigate
      replace
      to={`/servicios/${slug}${location.search}${location.hash}`}
    />
  );
}

function RedirectLegacyOrder() {
  const location = useLocation();
  const { orderNumber } = useParams();

  return (
    <Navigate
      replace
      to={`/servicios/ordenes/${orderNumber}${location.search}${location.hash}`}
    />
  );
}

const router = createBrowserRouter([
  {
    path: "/coming-soon",
    element: <ComingSoonPage />,
  },
  { path: "/unsubscribe", element: <Navigate replace to="/" /> },
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <ComingSoonPage />,
      },
      {
        path: "home",
        element: <JJPegaHomePage />,
      },
      {
        path: "servicios",
        loader: loadProductsCatalog,
        element: <StorePage />,
      },
      { path: "stickers-individuales", element: <StickerIndividualsPage /> },
      { path: "packs", element: <StickerPacksPage /> },
      { path: "servicios/stickers-individuales", element: <StickerIndividualsPage /> },
      { path: "servicios/packs", element: <StickerPacksPage /> },
      {
        path: "personaliza",
        element: <JJPersonalizePage />,
      },
      ...[
        "servicios/marca-o-negocio",
        "servicios/presencia-visual-profesional",
        "servicios/momento-especial",
        "servicios/solucion-creativa",
        "reservar",
        "portafolio",
        "equipo",
        "blog",
        "membresias",
        "conoce-tu-negocio",
        "landing/:slug",
        "preview/quland-system",
      ].map((path) => ({ path, element: <Navigate replace to="/personaliza" /> })),
      {
        path: "servicios/contratar",
        element: <RedirectWithLocation to="/servicios" />,
      },
      {
        path: "servicios/contratar/:slug",
        element: <RedirectLegacyStoreProduct />,
      },
      {
        path: "servicios/productos",
        element: <RedirectWithLocation to="/servicios" />,
      },
      {
        path: "servicios/productos/:slug",
        element: <RedirectLegacyStoreProduct />,
      },
      {
        path: "servicios/carrito",
        element: <CartPage />,
      },
      {
        path: "servicios/checkout",
        element: <CheckoutPage />,
      },
      {
        path: "servicios/ordenes/:orderNumber",
        loader: async ({ params }) => {
          try {
            return {
              order: await getPublicOrderByNumber(params.orderNumber),
            };
          } catch (error) {
            return {
              order: null,
            };
          }
        },
        element: <OrderConfirmationPage />,
      },
      {
        path: "servicios/:slug",
        loader: loadProductDetail,
        element: <ProductDetailPage />,
      },
      {
        path: "tienda",
        element: <RedirectWithLocation to="/servicios" />,
      },
      {
        path: "tienda/:slug",
        element: <RedirectLegacyStoreProduct />,
      },
      {
        path: "contacto",
        element: <ContactPage />,
      },
      { path: "privacy-policy", element: <LegalPage /> },
      { path: "terms", element: <LegalPage /> },
      { path: "data-deletion", element: <LegalPage /> },
      {
        path: "formulario-negocio",
        element: <RedirectWithLocation to="/personaliza" />,
      },
      {
        path: "carrito",
        element: <RedirectWithLocation to="/servicios/carrito" />,
      },
      {
        path: "checkout",
        element: <RedirectWithLocation to="/servicios/checkout" />,
      },
      {
        path: "ordenes/:orderNumber",
        element: <RedirectLegacyOrder />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
