// Thin fetch wrapper. Proxied through Vite's dev server (/api -> Node backend).
//
// Phase 3 added JWT auth: access tokens live in memory only (never
// localStorage, to limit XSS exposure) and are attached via a getter that
// AuthContext registers. Refresh tokens are httpOnly cookies the browser
// sends automatically, so this file never touches them directly.
const BASE_URL = "/api";

let getAccessToken = () => null;
let onUnauthorized = () => {};
let getBranchHeader = () => null;

// AuthContext calls this once on mount so this module can read the
// current token / react to a fully-expired session without a circular
// import (api.js has no dependency on AuthContext).
export function configureApi({ getToken, onAuthExpired }) {
  if (getToken) getAccessToken = getToken;
  if (onAuthExpired) onUnauthorized = onAuthExpired;
}

// BranchContext calls this so every request can carry the admin's current
// branch-context switch (see BranchContext.jsx) without a circular import.
export function setBranchHeaderGetter(getter) {
  getBranchHeader = getter;
}

let refreshPromise = null;

async function refreshAccessToken() {
  // Dedupe concurrent 401s into a single refresh call.
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("refresh failed"))))
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, options = {}, { isRetry = false, raw = false } = {}) {
  const token = getAccessToken();
  const branchId = getBranchHeader();
  // FormData (CSV import) sets its own Content-Type with a multipart
  // boundary — the browser only does this correctly if we don't set one
  // ourselves, so it's omitted rather than hardcoded to JSON.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId ? { "X-Branch-Id": branchId } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (res.status === 401 && !isRetry && path !== "/auth/login" && path !== "/auth/refresh") {
    try {
      const { accessToken } = await refreshAccessToken();
      onUnauthorized({ type: "refreshed", accessToken });
      return request(path, options, { isRetry: true, raw });
    } catch {
      onUnauthorized({ type: "expired" });
      throw new Error("Session expired, please log in again");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed: ${res.status}`);
    if (body.details) err.details = body.details;
    err.status = res.status;
    throw err;
  }
  // Non-JSON responses (e.g. the attendance CSV export) — caller handles
  // the raw Response so it can read it as a blob instead of res.json().
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
  // Multipart upload (CSV import) — still carries the same Bearer token /
  // branch header as the JSON helpers above.
  postForm: (path, formData) => request(path, { method: "POST", body: formData }),
  // A plain <a href="/api/..."> can't carry the in-memory Bearer token, so
  // file downloads (CSV export) go through this and get turned into an
  // object URL client-side.
  getBlob: (path) => request(path, {}, { raw: true }).then((res) => res.blob())
};
