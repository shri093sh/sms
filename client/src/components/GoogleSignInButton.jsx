import { useEffect, useRef, useState } from "react";

// Phase 15 — Google Sign-In. Loads Google Identity Services on demand
// (rather than a <script> tag in index.html) so the app has zero Google
// footprint when VITE_GOOGLE_CLIENT_ID is unset — matches the server,
// which disables the /auth/google route with a clear error in that case.
const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

let gisLoadPromise = null;
function loadGis() {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

// onCredential receives the raw ID token string; the caller (Login.jsx)
// is responsible for exchanging it via AuthContext.googleLogin.
export default function GoogleSignInButton({ onCredential, onError, disabled }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
          // Skip the "Sign in as X" auto-select prompt — this is a
          // multi-role staff app, not a consumer app, so let people
          // choose deliberately every time.
          auto_select: false
        });
        setReady(true);
      })
      .catch((err) => onError?.(err.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !buttonRef.current) return;
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: 332,
      text: "signin_with"
    });
  }, [ready]);

  if (!CLIENT_ID) return null;

  return (
    <div
      ref={buttonRef}
      style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}
    />
  );
}
