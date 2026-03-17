import React from "react";
import { Outlet } from "react-router-dom";
import PublicHeader from "./PublicHeader.jsx";
import PublicFooter from "./PublicFooter.jsx";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
