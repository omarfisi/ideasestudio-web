import {
  createBrowserRouter,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout.jsx";
import {
  getPublicCatalog,
  getPublicClientRouteBundle,
  getPublicProductBySlug,
  getPublicProductCategories,
  getPublicOrderByNumber,
  getPublicProducts,
  getPublicServiceCategories,
  getPublicServiceBySlug,
} from "@/lib/api.js";
import HomePage from "@/pages/HomePage.jsx";
import SmallBusinessPage from "@/pages/SmallBusinessPage.jsx";
import EntrepreneurPage from "@/pages/EntrepreneurPage.jsx";
import EmergingBusinessPage from "@/pages/EmergingBusinessPage.jsx";
import WeddingsPage from "@/pages/WeddingsPage.jsx";
import ServicesPage from "@/pages/ServicesPage.jsx";
import ServiceDetailPage from "@/pages/ServiceDetailPage.jsx";
import StorePage from "@/pages/StorePage.jsx";
import ProductDetailPage from "@/pages/ProductDetailPage.jsx";
import PortfolioPage from "@/pages/PortfolioPage.jsx";
import AboutPage from "@/pages/AboutPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import CartPage from "@/pages/CartPage.jsx";
import CheckoutPage from "@/pages/CheckoutPage.jsx";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage.jsx";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
import RouteErrorPage from "@/pages/RouteErrorPage.jsx";
import { getClientRouteByKey } from "@/data/routes.js";

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

const loadServicesCatalog = async () => {
  try {
    const [catalog, categories] = await Promise.all([
      getPublicCatalog(),
      getPublicServiceCategories(),
    ]);

    return {
      services: catalog.items,
      categories,
    };
  } catch (error) {
    return {
      services: [],
      categories: [],
    };
  }
};

const loadServiceDetail = async ({ params }) => {
  try {
    return {
      service: await getPublicServiceBySlug(params.slug),
    };
  } catch (error) {
    return {
      service: null,
    };
  }
};

const loadProductsCatalog = async ({ request }) => {
  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get("category") || "all",
    productType: url.searchParams.get("productType") || "all",
    search: url.searchParams.get("q") || "",
  };

  try {
    const [catalog, categories] = await Promise.all([
      getPublicProducts(filters),
      getPublicProductCategories(),
    ]);

    return {
      products: catalog.items,
      categories,
      filters,
    };
  } catch (error) {
    return {
      products: [],
      categories: [],
      filters,
    };
  }
};

const loadProductDetail = async ({ params }) => {
  try {
    return {
      product: await getPublicProductBySlug(params.slug),
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
      to={`/servicios/productos/${slug}${location.search}${location.hash}`}
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
        loader: loadServicesCatalog,
        element: <ServicesPage />,
      },
      {
        path: "servicios/productos",
        loader: loadProductsCatalog,
        element: <StorePage />,
      },
      {
        path: "servicios/productos/:slug",
        loader: loadProductDetail,
        element: <ProductDetailPage />,
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
        loader: loadServiceDetail,
        element: <ServiceDetailPage />,
      },
      {
        path: "tienda",
        element: <RedirectWithLocation to="/servicios/productos" />,
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
        path: "sobre-nosotros",
        element: <AboutPage />,
      },
      {
        path: "nosotros",
        element: <Navigate replace to="/sobre-nosotros" />,
      },
      {
        path: "contacto",
        element: <ContactPage />,
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
