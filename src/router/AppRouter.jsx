import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout.jsx";
import {
  getPublicCatalog,
  getPublicClientRouteBundle,
  getPublicServiceBySlug,
} from "@/lib/api.js";
import HomePage from "@/pages/HomePage.jsx";
import SmallBusinessPage from "@/pages/SmallBusinessPage.jsx";
import EntrepreneurPage from "@/pages/EntrepreneurPage.jsx";
import EmergingBusinessPage from "@/pages/EmergingBusinessPage.jsx";
import WeddingsPage from "@/pages/WeddingsPage.jsx";
import ServicesPage from "@/pages/ServicesPage.jsx";
import ServiceDetailPage from "@/pages/ServiceDetailPage.jsx";
import PortfolioPage from "@/pages/PortfolioPage.jsx";
import AboutPage from "@/pages/AboutPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import CartPage from "@/pages/CartPage.jsx";
import CheckoutPage from "@/pages/CheckoutPage.jsx";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
import RouteErrorPage from "@/pages/RouteErrorPage.jsx";

const loadClientRoute = (routeKey) => async () =>
  getPublicClientRouteBundle(routeKey);

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
        loader: async () => {
          const catalog = await getPublicCatalog();

          return {
            services: catalog.items,
          };
        },
        element: <ServicesPage />,
      },
      {
        path: "servicios/:slug",
        loader: async ({ params }) => ({
          service: await getPublicServiceBySlug(params.slug),
        }),
        element: <ServiceDetailPage />,
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
        element: <CartPage />,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
