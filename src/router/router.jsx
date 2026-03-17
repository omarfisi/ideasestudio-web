import React from "react";
import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout.jsx";
import HomePage from "@/pages/public/HomePage.jsx";
import ServicesPage from "@/pages/public/ServicesPage.jsx";
import AboutPage from "@/pages/public/AboutPage.jsx";
import ContactPage from "@/pages/public/ContactPage.jsx";
import BlogPage from "@/pages/public/BlogPage.jsx";
import PortfolioPage from "@/pages/public/PortfolioPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "servicios", element: <ServicesPage /> },
      { path: "nosotros", element: <AboutPage /> },
      { path: "contacto", element: <ContactPage /> },
      { path: "blog", element: <BlogPage /> },
      { path: "portafolio", element: <PortfolioPage /> },
    ],
  },
]);

export default router;
