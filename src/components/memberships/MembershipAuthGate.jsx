import { useRef, useState } from "react";
import MembershipLoginPanel from "@/components/memberships/MembershipLoginPanel.jsx";
import MembershipSignupPanel from "@/components/memberships/MembershipSignupPanel.jsx";

const TABS = [
  { key: "login", label: "Iniciar sesión" },
  { key: "signup", label: "Crear cuenta" },
];

/**
 * Blocks the payment step until a Supabase session exists. Full W3C APG
 * tabs pattern: roving tabindex (only the active tab is in the natural
 * Tab order) plus ArrowLeft/ArrowRight/Home/End, with automatic
 * activation — arrowing to a tab selects it immediately, matching how
 * few/simple tab sets are conventionally expected to behave.
 */
export default function MembershipAuthGate() {
  const [tab, setTab] = useState("login");
  const tabRefs = useRef({});

  function selectTab(key) {
    setTab(key);
    tabRefs.current[key]?.focus();
  }

  function handleKeyDown(event) {
    const currentIndex = TABS.findIndex((t) => t.key === tab);
    let nextIndex = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      selectTab(TABS[nextIndex].key);
    }
  }

  return (
    <div className="card-light membership-checkout-authgate">
      <p className="label-text" style={{ color: "rgba(11,11,13,0.6)" }}>
        Cuenta
      </p>
      <p className="body-md membership-checkout-authgate__hint">
        Necesitas una cuenta para continuar al pago seguro de tu membresía.
      </p>

      <div
        className="membership-checkout-authgate__tabs"
        role="tablist"
        aria-label="Acceso a tu cuenta"
        onKeyDown={handleKeyDown}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[key] = el;
            }}
            type="button"
            role="tab"
            id={`membership-auth-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`membership-auth-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            className={`membership-checkout-authgate__tab${
              tab === key ? " membership-checkout-authgate__tab--active" : ""
            }`}
            onClick={() => selectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`membership-auth-panel-${tab}`}
        aria-labelledby={`membership-auth-tab-${tab}`}
      >
        {tab === "login" ? <MembershipLoginPanel /> : <MembershipSignupPanel />}
      </div>
    </div>
  );
}
