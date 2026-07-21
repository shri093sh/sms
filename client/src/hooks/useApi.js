import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";

// Shared data-fetching hook for read-only GET endpoints. Handles the
// loading/error/data trio plus optional polling — first use is the
// dashboard (stats summary + activity feed), later phases can reuse it
// for any list view.
//
// options.intervalMs: if set, re-fetches on that interval (paused while
// the tab is hidden, to avoid burning requests in a background tab).
export function useApi(path, { intervalMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    try {
      const result = await api.get(pathRef.current);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();

    if (!intervalMs) return;

    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, intervalMs, load]);

  return { data, error, loading, refetch: load };
}
