import { Outlet, ScrollRestoration } from "react-router-dom";
import Header from "@/components/layout/Header.jsx";
import Footer from "@/components/layout/Footer.jsx";

export default function MainLayout() {
  return (
    <div className="site-shell">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
