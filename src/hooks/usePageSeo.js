import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPublicSeo } from "@/lib/seoApi.js";

export function usePageSeo() {
  const { pathname } = useLocation();
  const [seoEntry, setSeoEntry] = useState(null);

  useEffect(() => {
    let active = true;
    getPublicSeo(pathname).then((entry) => {
      if (active) setSeoEntry(entry);
    });
    return () => { active = false; };
  }, [pathname]);

  return seoEntry;
}
