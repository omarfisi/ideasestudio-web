import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient.js";

export default function AccountCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verificando enlace...");

  useEffect(() => {
    if (!supabase) {
      setStatus("El portal no está configurado. Contacta al equipo.");
      return;
    }

    // Supabase PKCE: exchangeCodeForSession lee el code del URL automáticamente.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setStatus("No se pudo verificar el enlace. Puede haber expirado. Vuelve a intentarlo.");
        setTimeout(() => navigate("/mi-cuenta/login"), 3000);
        return;
      }
      navigate("/mi-cuenta", { replace: true });
    });
  }, [navigate]);

  return (
    <section className="section">
      <div className="container">
        <div className="empty-state">
          <p>{status}</p>
        </div>
      </div>
    </section>
  );
}
