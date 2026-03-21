import { useLoaderData } from "react-router-dom";
import HeroHome from "@/components/home/HeroHome.jsx";
import ClientRoutes from "@/components/home/ClientRoutes.jsx";
import ServicesOverview from "@/components/home/ServicesOverview.jsx";
import ProcessSection from "@/components/home/ProcessSection.jsx";
import PortfolioPreview from "@/components/home/PortfolioPreview.jsx";
import AboutPreview from "@/components/home/AboutPreview.jsx";
import FinalCTA from "@/components/home/FinalCTA.jsx";

export default function HomePage() {
  const { featuredServices } = useLoaderData();

  return (
    <>
      <HeroHome />
      <ClientRoutes />
      <ServicesOverview services={featuredServices} />
      <ProcessSection />
      <PortfolioPreview />
      <AboutPreview />
      <FinalCTA />
    </>
  );
}
