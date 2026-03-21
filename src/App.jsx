import { RouterProvider } from "react-router-dom";
import router from "@/router/AppRouter.jsx";

export default function App() {
  return <RouterProvider router={router} />;
}
