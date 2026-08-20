import {
  createBrowserRouter,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout.jsx";
import {
  getPublicClientRouteBundle,
  getPublicProductBySlug,
  getPublicOrderByNumber,
  getPublicPortfolioItems,
  getPublicServiceSegment,
} from "@/lib/api.js";
import HomePage from "@/pages/HomePage.jsx";
import SmallBusinessPage from "@/pages/SmallBusinessPage.jsx";
import EntrepreneurPage from "@/pages/EntrepreneurPage.jsx";
import EmergingBusinessPage from "@/pages/EmergingBusinessPage.jsx";
import WeddingsPage from "@/pages/WeddingsPage.jsx";
import ServiceNichePage from "@/pages/ServiceNichePage.jsx";
import StorePage from "@/pages/StorePage.jsx";
import ProductDetailPage from "@/pages/ProductDetailPage.jsx";
import MembershipCheckoutPage from "@/pages/MembershipCheckoutPage.jsx";
import MembershipCheckoutSuccessPage from "@/pages/MembershipCheckoutSuccessPage.jsx";
import MembershipCheckoutCancelPage from "@/pages/MembershipCheckoutCancelPage.jsx";
import PortfolioPage from "@/pages/PortfolioPage.jsx";
import PortfolioProjectPage from "@/pages/PortfolioProjectPage.jsx";
import TeamPage from "@/pages/TeamPage.jsx";
import BlogPage from "@/pages/BlogPage.jsx";
import BlogPostDetailPage from "@/pages/BlogPostDetailPage.jsx";
import BlogPostPreviewPage from "@/pages/BlogPostPreviewPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import BusinessIntakeLanding from "@/pages/BusinessIntakeLanding.jsx";
import CartPage from "@/pages/CartPage.jsx";
import CheckoutPage from "@/pages/CheckoutPage.jsx";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage.jsx";
import AccountLoginPage from "@/pages/AccountLoginPage.jsx";
import AccountCallbackPage from "@/pages/AccountCallbackPage.jsx";
import AccountPasswordResetPage from "@/pages/AccountPasswordResetPage.jsx";
import AccountPage from "@/pages/AccountPage.jsx";
import AccountOrderDetailPage from "@/pages/AccountOrderDetailPage.jsx";
import AccountOrderPaymentPage from "@/pages/AccountOrderPaymentPage.jsx";
import AccountOrderReschedulePage from "@/pages/AccountOrderReschedulePage.jsx";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
import CmsPage from "@/pages/CmsPage.jsx";
import UnsubscribePage from "@/pages/UnsubscribePage.jsx";
import RouteErrorPage from "@/pages/RouteErrorPage.jsx";
import LegalPage from "@/pages/LegalPage.jsx";
import QulandSystemPreview from "@/pages/QulandSystemPreview.jsx";
import { getClientRouteByKey } from "@/data/routes.js";
import { getServiceNichePageBySlug } from "@/data/serviceNichePages.js";

const loadClientRoute = (routeKey) => async () => {
  try {
    return await getPublicClientRouteBundle(routeKey);
  } catch (error) {
    return {
      route: getClientRouteByKey(routeKey),
      services: [],
    };
  }
};

const loadServiceNiche = (slug) => async () => {
  try {
    const data = await getPublicServiceSegment(slug);
    if (data?.segment) {
      return { niche: getServiceNichePageBySlug(slug), segment: data.segment, services: data.services ?? [] };
    }
  } catch {
    // fall through to local data
  }
  return { niche: getServiceNichePageBySlug(slug), segment: null, services: [] };
};

const loadProductsCatalog = ({ request }) => {
  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get("category") || "all",
    productType: "service",
    search: url.searchParams.get("q") || "",
  };

  return { filters };
};

const loadProductDetail = async ({ params }) => {
  try {
    const product = await getPublicProductBySlug(params.slug);
    if (!product || product.productType !== "service" || !product.isActive) {
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

const loadPortfolioProject = async ({ params }) => {
  try {
    const items = await getPublicPortfolioItems({ limit: 500 });
    const project = items.find((item) => item.slug === params.slug) || null;

    if (!project) {
      return {
        project: null,
        related: [],
      };
    }

    const candidates = items.filter(
      (item) => item.slug && item.slug !== project.slug
    );
    const preferred = candidates.filter(
      (item) =>
        item.subcategory === project.subcategory ||
        item.category === project.category
    );
    const preferredIds = new Set(preferred.map((item) => item.id));

    return {
      project,
      related: [
        ...preferred,
        ...candidates.filter((item) => !preferredIds.has(item.id)),
      ],
    };
  } catch {
    return {
      project: null,
      related: [],
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
    path: "/unsubscribe",
    element: <UnsubscribePage />,
  },
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "pequenos-negocios",
        loader: loadClientRoute("small_business"),
        element: <SmallBusinessPage />,
      },
      {
        path: "emprendedores",
        loader: loadClientRoute("entrepreneur"),
        element: <EntrepreneurPage />,
      },
      {
        path: "empresas-emergentes",
        loader: loadClientRoute("emerging_business"),
        element: <EmergingBusinessPage />,
      },
      {
        path: "bodas-eventos-sesiones",
        loader: loadClientRoute("weddings_events_sessions"),
        element: <WeddingsPage />,
      },
      {
        path: "servicios",
        loader: loadProductsCatalog,
        element: <StorePage />,
      },
      {
        path: "servicios/marca-o-negocio",
        loader: loadServiceNiche("marca-o-negocio"),
        element: <ServiceNichePage />,
      },
      {
        path: "servicios/presencia-visual-profesional",
        loader: loadServiceNiche("presencia-visual-profesional"),
        element: <ServiceNichePage />,
      },
      {
        path: "servicios/momento-especial",
        loader: loadServiceNiche("momento-especial"),
        element: <ServiceNichePage />,
      },
      {
        path: "servicios/solucion-creativa",
        loader: loadServiceNiche("solucion-creativa"),
        element: <ServiceNichePage />,
      },
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
        path: "portafolio",
        element: <PortfolioPage />,
      },
      {
        path: "portafolio/:slug",
        loader: loadPortfolioProject,
        element: <PortfolioProjectPage />,
      },
      {
        path: "equipo",
        element: <TeamPage />,
      },
      {
        path: "membresias",
        element: <Navigate to="/servicios" replace />,
      },
      {
        path: "membresias/checkout",
        element: <MembershipCheckoutPage />,
      },
      {
        path: "membresias/checkout/exito",
        element: <MembershipCheckoutSuccessPage />,
      },
      {
        path: "membresias/checkout/cancelado",
        element: <MembershipCheckoutCancelPage />,
      },
      {
        path: "blog",
        element: <BlogPage />,
      },
      {
        path: "blog/preview",
        element: <BlogPostPreviewPage />,
      },
      {
        path: "blog/:slug",
        element: <BlogPostDetailPage />,
      },
      {
        path: "contacto",
        element: <ContactPage />,
      },
      { path: "privacy-policy", element: <LegalPage /> },
      { path: "terms", element: <LegalPage /> },
      { path: "data-deletion", element: <LegalPage /> },
      {
        path: "conoce-tu-negocio",
        element: <BusinessIntakeLanding />,
      },
      {
        path: "landing/:slug",
        element: <BusinessIntakeLanding />,
      },
      {
        path: "formulario-negocio",
        element: <RedirectWithLocation to="/conoce-tu-negocio" />,
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
        path: "mi-cuenta/login",
        element: <AccountLoginPage />,
      },
      {
        path: "mi-cuenta/callback",
        element: <AccountCallbackPage />,
      },
      {
        path: "mi-cuenta/reset-password",
        element: <AccountPasswordResetPage />,
      },
      {
        path: "mi-cuenta/ordenes/:orderId",
        element: <AccountOrderDetailPage />,
      },
      {
        path: "mi-cuenta/ordenes/:orderId/pagar",
        element: <AccountOrderPaymentPage />,
      },
      {
        path: "mi-cuenta/ordenes/:orderId/reprogramar",
        element: <AccountOrderReschedulePage />,
      },
      {
        path: "mi-cuenta",
        element: <AccountPage />,
      },
      {
        path: "preview/quland-system",
        element: <QulandSystemPreview />,
      },
      {
        path: "*",
        element: <CmsPage />,
      },
    ],
  },
]);

export default router;
