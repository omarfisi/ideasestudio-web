import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import router from "@/router/AppRouter.jsx";
import { AuthProvider } from "@/contexts/AuthContext.jsx";

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </HelmetProvider>
  );
}
