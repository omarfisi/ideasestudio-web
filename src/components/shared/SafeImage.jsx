import { useEffect, useState } from "react";

/** Render a validated fallback when a legacy storage URL is unavailable. */
export default function SafeImage({ src, fallbackSrc, onError, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc || "");

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc || "");
  }, [src, fallbackSrc]);

  function handleError(event) {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onError?.(event);
  }

  return <img {...props} src={currentSrc} onError={handleError} />;
}
