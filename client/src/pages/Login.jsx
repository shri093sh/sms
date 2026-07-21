import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

// Ported from the original app's demo-login grid (see PROGRESS.md Phase 2
// notes / prisma/seed.js) — same three seeded accounts, same shared
// password, purely a dev convenience.
const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@prerana.demo", label: "Admin", name: "Asha Rao" },
  { role: "teacher", email: "teacher@prerana.demo", label: "Teacher", name: "Vikram Shetty" },
  { role: "accountant", email: "accountant@prerana.demo", label: "Accountant", name: "Meera Nair" }
];
const DEMO_PASSWORD = "demo1234";

export default function Login() {
  const { login, googleLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setError("");
    setSubmitting(true);
    try {
      await googleLogin(credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin(account) {
    setError("");
    setSubmitting(true);
    try {
      await login(account.email, DEMO_PASSWORD);
      toast.success(`Signed in as ${account.name}`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 24 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
          <h1 className="display" style={{ margin: 0, fontSize: 22 }}>
            Prerana SMS
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}
        >
          <label style={fieldLabel}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="username"
            />
          </label>
          <label style={fieldLabel}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </label>

          {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              padding: "11px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} disabled={submitting} />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8, textAlign: "center" }}>
            Quick access — demo accounts (dev only)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={submitting}
                onClick={() => handleDemoLogin(account)}
                style={{
                  flex: 1,
                  padding: "10px 6px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--panel-2)",
                  color: "var(--text-dim)",
                  fontSize: 12,
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--text-dim)"
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none"
};
