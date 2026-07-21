import { createContext, useContext, useEffect, useState } from "react";
import { api, setBranchHeaderGetter } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const BranchContext = createContext(null);

// Non-sensitive convenience value (which branch an admin is currently
// viewing) — fine to persist in localStorage, unlike the access token.
const STORAGE_KEY = "prerana_branch_context";

export function BranchProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  // api.js has no dependency on this file (would be circular), so we hand
  // it a getter it calls on every request, same pattern as configureApi
  // in AuthContext.
  useEffect(() => {
    setBranchHeaderGetter(() => (isAdmin ? branchId || null : null));
  }, [isAdmin, branchId]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setBranches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get("/branches")
      .then((data) => {
        if (!cancelled) setBranches(data.branches || []);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAdmin]);

  function selectBranch(nextId) {
    setBranchId(nextId);
    if (nextId) {
      localStorage.setItem(STORAGE_KEY, nextId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const activeBranch = branches.find((b) => b.id === branchId) || null;

  const value = { branches, branchId, activeBranch, selectBranch, loading, isAdmin };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within a BranchProvider");
  return ctx;
}
