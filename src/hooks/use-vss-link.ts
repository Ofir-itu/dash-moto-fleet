import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BASE_TELEMETRY, stepTelemetry, type LinkMode, type Telemetry } from "@/lib/fleet-data";
import { vssAuth, type VssSession } from "@/lib/vss.functions";
import { VssSocket, type VssStatus } from "@/lib/vss-socket";
import { probeLocalStatus, localLogin, type ItoolSession } from "@/lib/wifi-direct";
import { secureGet, secureSet, secureClear } from "@/lib/secure-store";

export const LOW_VOLTAGE_THRESHOLD = 11.5;
export const CRASH_TILT_DEG = 45;
export const CRASH_G_FORCE = 2;

export type LinkState = {
  status: VssStatus;
  message?: string | undefined;
  /** where the HUD numbers are coming from right now */
  source: "cloud" | "wifi" | "simulado";
};

const SESSION_KEY = "vss-session";
const LOCAL_SESSION_KEY = "itool-session";
const REFRESH_MARGIN_MS = 2 * 60 * 1000; // refresh 2 min before the 30 min expiry
const LOCAL_POLL_MS = 2000;

export function useVssLink(linkMode: LinkMode) {
  const login = useServerFn(vssAuth);
  const [telemetry, setTelemetry] = useState<Telemetry>(BASE_TELEMETRY);
  const [link, setLink] = useState<LinkState>({ status: "idle", source: "simulado" });
  const [session, setSession] = useState<VssSession | null>(null);
  const [localSession, setLocalSession] = useState<ItoolSession | null>(null);
  const [needsLocalLogin, setNeedsLocalLogin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const liveRef = useRef(false);

  const patch = useCallback((p: Partial<Telemetry>) => {
    if (Object.keys(p).length === 0) return;
    liveRef.current = true;
    setTelemetry((t) => ({ ...t, ...p }));
  }, []);

  /* ---------- 1. Local iTool session (primary mode) ---------- */
  useEffect(() => {
    if (linkMode !== "wifi") return;
    let cancelled = false;
    void (async () => {
      const cached = await secureGet<ItoolSession>(LOCAL_SESSION_KEY);
      if (cancelled) return;
      if (cached) setLocalSession(cached);
      else setNeedsLocalLogin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkMode]);

  /**
   * Instant local connect: never blocks on an HTTP round-trip (CORS / dual
   * interface routing with 4G active makes those fail). The session is stored
   * optimistically and upgraded in the background when the camera answers.
   */
  const loginLocal = useCallback(async (password: string) => {
    setLocalBusy(false);
    setLocalError(null);
    const optimistic: ItoolSession = { seed: "", jsession: "" };
    setLocalSession(optimistic);
    setNeedsLocalLogin(false);
    setLink({ status: "online", source: "wifi" });
    void secureSet(LOCAL_SESSION_KEY, optimistic);

    // background upgrade — failures are silent, UI stays connected
    void localLogin(password)
      .then((s) => {
        if (!s?.jsession) return;
        setLocalSession(s);
        void secureSet(LOCAL_SESSION_KEY, s);
      })
      .catch(() => {});

    return true;
  }, []);


  const logoutLocal = useCallback(() => {
    secureClear(LOCAL_SESSION_KEY);
    setLocalSession(null);
    setNeedsLocalLogin(true);
  }, []);

  /* ---------- 2. Wi-Fi Direct telemetry polling (msg 1015 / 8015) ---------- */
  useEffect(() => {
    if (linkMode !== "wifi" || !localSession) return;
    let cancelled = false;
    const controller = new AbortController();
    let failures = 0;

    const poll = async () => {
      try {
        const data = await probeLocalStatus(localSession, controller.signal);
        if (cancelled) return;
        failures = 0;
        setLink({ status: "online", source: "wifi" });
        patch(data);
      } catch {
        if (cancelled) return;
        // Never drop the AP session: polling can fail from CORS or dual
        // interface routing while the camera stream itself works fine.
        failures += 1;
        if (failures >= 2) {
          setLink({ status: "online", source: "wifi", message: "aguardando telemetria" });
        }
      }
    };


    void poll();
    const id = setInterval(poll, LOCAL_POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [linkMode, localSession, patch]);

  /* ---------- 3. Cloud auth proxy + auto-refresh (fallback mode) ---------- */
  const authenticate = useCallback(async () => {
    const cached = await secureGet<VssSession>(SESSION_KEY);
    if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      setSession(cached);
      return cached;
    }
    const res = await login({ data: {} });
    if (!res.ok) {
      setLink({ status: "error", message: res.error, source: "simulado" });
      return null;
    }
    await secureSet(SESSION_KEY, res.session);
    setSession(res.session);
    return res.session;
  }, [login]);

  useEffect(() => {
    if (linkMode !== "cloud") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const run = async () => {
      const s = await authenticate();
      if (cancelled || !s) return;
      const delay = Math.max(30_000, s.expiresAt - Date.now() - REFRESH_MARGIN_MS);
      timer = setTimeout(run, delay);
    };
    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [linkMode, authenticate]);

  /* ---------- 4. Cloud 4G: WebSocket telemetry ---------- */
  useEffect(() => {
    if (linkMode !== "cloud" || !session) return;
    const socket = new VssSocket(session, {
      onTelemetry: patch,
      onStatus: (status, message) =>
        setLink({ status, message, source: status === "online" ? "cloud" : "simulado" }),
    });
    socket.connect();
    return () => socket.close();
  }, [linkMode, session, patch]);

  /* ---------- 5. Simulated fallback while no live source ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (liveRef.current) return;
      setTelemetry((t) => stepTelemetry(t));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const lowBattery = telemetry.batteryVolts < LOW_VOLTAGE_THRESHOLD;
  const crash = telemetry.tiltDeg >= CRASH_TILT_DEG || telemetry.gForce >= CRASH_G_FORCE;

  return {
    telemetry,
    link,
    session,
    localSession,
    isConnected: linkMode === "wifi" ? localSession !== null : link.status === "online",
    needsLocalLogin: linkMode === "wifi" && needsLocalLogin,
    localError,
    localBusy,
    loginLocal,
    logoutLocal,
    lowBattery,
    crash,
    dismissLocalLogin: () => setNeedsLocalLogin(false),
    reopenLocalLogin: () => setNeedsLocalLogin(true),
  };

}
