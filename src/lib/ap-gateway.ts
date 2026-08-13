import { useSyncExternalStore } from "react";

/** Default camera Access Point gateway address (standard Wi-Fi AP mode). */
export const DEFAULT_AP_HOST = "192.168.1.1";
const STORAGE_KEY = "camera-ap-host";

let host = DEFAULT_AP_HOST;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) host = saved;
}

const sanitize = (value: string) =>
  value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "") || DEFAULT_AP_HOST;

/** Bare host (ip or hostname) of the camera AP gateway. */
export function getApHost() {
  return host;
}

/** Full http base URL of the camera AP gateway. */
export function apBase() {
  return `http://${host}`;
}

export function setApHost(value: string) {
  host = sanitize(value);
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, host);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React binding so screens re-render when the AP address changes. */
export function useApHost() {
  return useSyncExternalStore(subscribe, getApHost, () => DEFAULT_AP_HOST);
}
