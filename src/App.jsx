import { RouterProvider } from "react-router-dom";
import router from "@/router/AppRouter.jsx";
import { AuthProvider } from "@/contexts/AuthContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
