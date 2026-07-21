import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, configureApi } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial refresh attempt resolves
  const accessTokenRef = useRef(null);

  // api.js can't import this file (would be circular), so we hand it a
  // getter/setter pair instead: it reads the current token before every
  // request and calls back here when a 401 gets silently refreshed or
  // the session is fully expired.
  useEffect(() => {
    configureApi({
      getToken: () => accessTokenRef.current,
      onAuthExpired: (event) => {
        if (event.type === "refreshed") {
          accessTokenRef.current = event.accessToken;
        } else {
          accessTokenRef.current = null;
          setUser(null);
        }
      }
    });
  }, []);

  // On mount: the refresh token (httpOnly cookie) may still be valid even
  // though we have no access token in memory (e.g. page reload). Try to
  // silently restore the session before rendering protected routes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (!res.ok) throw new Error("no session");
        const data = await res.json();
        if (cancelled) return;
        accessTokenRef.current = data.accessToken;
        setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const data = await api.post("/auth/login", { email, password });
    accessTokenRef.current = data.accessToken;
    setUser(data.user);
    return data.user;
  }

  // credential is the ID token string Google Identity Services hands us
  // in the button's callback — see components/GoogleSignInButton.jsx.
  async function googleLogin(credential) {
    const data = await api.post("/auth/google", { credential });
    accessTokenRef.current = data.accessToken;
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Best-effort — clear local state regardless of network/server outcome.
    }
    accessTokenRef.current = null;
    setUser(null);
  }

  const value = { user, loading, login, googleLogin, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
