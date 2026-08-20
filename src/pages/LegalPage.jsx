import { Link, useLocation } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { SITE_CONTACT } from "@/lib/siteContact.js";

const BRAND_NAME = "Ideas Estudio";
const CONTROLLER_NAME = "OSVALDO MARFISI RODRIGUEZ";
const PUBLIC_ORIGIN = "https://www.ideasestudio.com";

const LEGAL_PAGES = {
  privacy: {
    canonicalPath: "privacy-policy",
    title: "Privacy Policy",
    description: "How Ideas Estudio collects, uses and protects information shared through its public website.",
    eyebrow: "Transparency",
    intro: "This policy explains how we handle information when you visit our website, request information, purchase a service or connect an integration.",
    sections: [
      ["Information we may receive", [
        "We may receive contact information that you voluntarily provide, such as your name, email address, phone number, business, service interest and message.",
        "When you use an account, checkout or booking flow, we may process the information needed to authenticate you, provide the service, complete the transaction and respond to related requests.",
        "We may also receive basic technical information about your visit, such as browser, device and pages visited, according to the configuration of the website and its supporting services.",
      ]],
      ["How we use information", [
        "We use information to answer inquiries, prepare proposals, provide services, process purchases, manage bookings, maintain security and improve the public Ideas Estudio experience.",
        "We do not sell personal information. We do not use the Meta integration to publish content or request Meta permissions that are not supported by a demonstrable feature.",
      ]],
      ["Meta Platform Data", [
        "If you connect a Facebook Page, the authorization flow may allow us to identify Pages you manage and read public posts from the selected Page. These capabilities correspond to pages_show_list and pages_read_engagement.",
        "Meta access tokens are received and stored only in the protected backend. They are not displayed on the public website or sent to the browser as part of the interface.",
        "You may disconnect the integration or request deletion of associated data by contacting us through the channel below.",
      ]],
      ["Technology providers", [
        "The public website is served through Vercel. The application may use Supabase for data, authentication or storage services, and Render for backend services. These providers supply infrastructure according to the services used by the application.",
        "Vercel is not presented as a processor of Meta data. Meta tokens and credentials are not included in public frontend assets.",
      ]],
      ["Retention and requests", [
        "We retain information for the time reasonably necessary for the purpose for which it was received, the business relationship, applicable obligations and dispute resolution. The specific period may depend on the information and relationship involved.",
        "You may request access, correction or deletion by contacting us. We may request reasonable information to verify identity and protect the account.",
      ]],
    ],
  },
  terms: {
    canonicalPath: "terms",
    title: "Terms and Conditions",
    description: "General conditions for using the public website and contracting Ideas Estudio services.",
    eyebrow: "Terms of use",
    intro: "By using this website or requesting Ideas Estudio services, you agree to use it lawfully, respectfully and consistently with these conditions.",
    sections: [
      ["Content and services", [
        "The website presents information about creative services, content, photography, video, branding, digital presence and other Ideas Estudio solutions. The availability, scope, price and schedule of a service are confirmed in the applicable proposal or agreement.",
        "Public content may change to reflect updates to services, processes, pricing, availability or operational information.",
      ]],
      ["Requests, purchases and bookings", [
        "Submitting a form, starting checkout or requesting a proposal does not by itself guarantee acceptance of an engagement. A service relationship is confirmed when Ideas Estudio accepts the request and its conditions are agreed.",
        "You must provide accurate information and keep secure any account used on the website. You must not use the website for fraud, abuse, unauthorized access or malicious content.",
      ]],
      ["Third-party integrations", [
        "When you connect a Facebook Page, you authorize only the functions shown in the Meta flow. The currently demonstrable integration lets you select a Page and read public posts from the selected Page.",
        "Ideas Estudio does not represent that this website publishes content, changes Page metadata or displays Meta Insights. Those functions are outside the current integration scope.",
      ]],
      ["Intellectual property", [
        "The name, identity, design, text, photography, graphics and other content on this website belong to Ideas Estudio or are used with authorization. You may not copy, redistribute, modify or exploit that content without permission, except as allowed by applicable law.",
      ]],
      ["Contact", [
        "Questions about these terms may be sent to the email below. Project, purchase or booking conditions may supplement these terms through a proposal, contract or service confirmation.",
      ]],
    ],
  },
  deletion: {
    canonicalPath: "data-deletion",
    title: "Data Deletion",
    description: "Request deletion of personal information or the Meta connection associated with Ideas Estudio.",
    eyebrow: "Your data",
    intro: "You may request deletion of personal information or data associated with a Meta connection. This page describes the public channel to start that request.",
    sections: [
      ["How to request deletion", [
        `Email ${SITE_CONTACT.email} from an address that reasonably identifies the request. Include your name, the email used and, if applicable, the Page name or Ideas Estudio account involved.`,
        "Do not include passwords, access tokens, App Secrets or credentials in the message. We never need you to email a Meta token.",
      ]],
      ["What may be deleted", [
        "Depending on the request, we may remove the Page association, delete the Meta connection, delete tokens stored for that connection and delete associated public data that is no longer necessary for the service.",
        "Deletion may be limited when information must be retained to meet a legal obligation, resolve a dispute, prevent fraud or document a transaction. We will explain any applicable limitation.",
      ]],
      ["Verification and response", [
        "We may request reasonable information to confirm that the request comes from the person or entity whose data is involved. After verification, we will review the scope and confirm the action taken or the reason for any limitation.",
      ]],
      ["Meta connections", [
        "You may also revoke access from your Facebook account settings. Revocation in Meta and a deletion request to Ideas Estudio are related actions, but they may require separate steps.",
      ]],
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const pageKey = pathname.endsWith("/terms")
    ? "terms"
    : pathname.endsWith("/data-deletion")
      ? "deletion"
      : "privacy";
  const page = LEGAL_PAGES[pageKey];

  return (
    <>
      <SEOHead
        title={page.title}
        description={page.description}
        canonical={`${PUBLIC_ORIGIN}/${page.canonicalPath}`}
      />
      <main className="legal-page">
        <section className="page-hero legal-page__hero">
          <div className="container page-hero__inner">
            <span className="eyebrow">{page.eyebrow}</span>
            <h1 className="page-title">{page.title}</h1>
            <p className="page-subtitle">{page.intro}</p>
            <p className="legal-page__updated">Data controller: {CONTROLLER_NAME} · Effective date: August 20, 2026</p>
          </div>
        </section>

        <section className="section legal-page__body">
          <div className="container legal-page__layout">
            <aside className="legal-page__aside" aria-label="Legal pages">
              <span className="eyebrow">{BRAND_NAME}</span>
              <nav className="legal-page__nav">
                <Link to="/privacy-policy">Privacy Policy</Link>
                <Link to="/terms">Terms and Conditions</Link>
                <Link to="/data-deletion">Data Deletion</Link>
              </nav>
              <div className="legal-page__contact">
                <strong>Questions?</strong>
                <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
                <a href={SITE_CONTACT.phone.href}>{SITE_CONTACT.phone.display}</a>
              </div>
            </aside>

            <div className="legal-page__content">
              {page.sections.map(([title, paragraphs]) => (
                <article className="legal-page__section" key={title}>
                  <h2>{title}</h2>
                  {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
