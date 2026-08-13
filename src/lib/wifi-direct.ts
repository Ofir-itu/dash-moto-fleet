import type { Telemetry } from "@/lib/fleet-data";
import { apBase, getApHost } from "@/lib/ap-gateway";

/** Camera Access Point gateway (standard Wi-Fi AP mode, no internet, no cloud). */
export const LOCAL_MEDIA_PORT = 5677;
export const DEFAULT_LOCAL_PASSWORD = "111111";

export const localGateway = () => apBase();
export const localHost = () => getApHost();

export const loginUrl = () => `${apBase()}/action/content?type=login`;
/** Msg 1015 -> response 8015 (<sysstatus>). */
export const statusUrl = () => `${apBase()}/action/content?type=info&func=sysstatus`;
export const filesUrl = () => `${apBase()}/action/api?type=query&func=picture`;

export type ItoolSession = { seed: string; jsession: string };

const pickTag = (src: string, tag: string) =>
  src.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"))?.[1]?.trim();

const pickJson = (src: string, key: string) =>
  src.match(new RegExp(`"${key}"\\s*:\\s*"?([^",}]+)"?`, "i"))?.[1]?.trim();

const pickAny = (src: string, key: string) => pickTag(src, key) ?? pickJson(src, key);

/** Local camera login -> { seed, jsession }. */
export async function localLogin(
  password: string,
  signal?: AbortSignal,
): Promise<ItoolSession> {
  const res = await fetch(loginUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ usr: "admin", pwd: password, password }).toString(),
    signal: signal ?? null,
  });
  if (!res.ok) throw new Error(`Login local falhou (${res.status})`);
  const text = await res.text();
  const jsession = pickAny(text, "jsession") ?? pickAny(text, "sessionid");
  if (!jsession) throw new Error("Senha incorreta ou câmera indisponível.");
  return { seed: pickAny(text, "seed") ?? "", jsession };
}

/** Parses the <sysstatus> block from response 8015 into a telemetry patch. */
export function parseSysStatus(body: string): Partial<Telemetry> {
  const num = (key: string) => {
    const v = pickAny(body, key);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const patch: Partial<Telemetry> = {};

  // <voltage>
  const voltage = num("voltage") ?? num("devVoltage");
  if (voltage != null) patch.batteryVolts = Math.round(voltage * 10) / 10;

  // <acc> (ignition)
  const acc = pickAny(body, "acc");
  if (acc != null) patch.ignition = acc === "1" || acc.toLowerCase() === "on";

  // <gps>
  const lat = num("latitude") ?? num("lat");
  const lng = num("longitude") ?? num("lng") ?? num("lon");
  if (lat != null && lat !== 0) patch.lat = lat;
  if (lng != null && lng !== 0) patch.lng = lng;
  const speed = num("speed");
  if (speed != null) patch.speedKmh = Math.round(speed);
  const heading = num("direct") ?? num("direction") ?? num("course");
  if (heading != null) patch.headingDeg = Math.round(heading);
  const sats = num("satellites") ?? num("sate") ?? num("gpsnum");
  if (sats != null) patch.satellites = sats;

  // <gsensor> — x/y/z in g, tilt derived when not reported directly
  const gx = num("gx") ?? num("x");
  const gy = num("gy") ?? num("y");
  const gz = num("gz") ?? num("z");
  const tilt = num("tilt") ?? num("angle");
  if (tilt != null) patch.tiltDeg = Math.round(tilt);
  else if (gx != null && gy != null && gz != null) {
    const horizontal = Math.hypot(gx, gy);
    patch.tiltDeg = Math.round((Math.atan2(horizontal, Math.abs(gz) || 1) * 180) / Math.PI);
  }
  const hit = num("hit") ?? num("impact");
  if (hit != null) patch.gForce = Math.round(hit * 100) / 100;
  else if (gx != null && gy != null && gz != null)
    patch.gForce = Math.round(Math.hypot(gx, gy, gz) * 100) / 100;

  return patch;
}

export async function probeLocalStatus(
  session?: ItoolSession | null,
  signal?: AbortSignal,
): Promise<Partial<Telemetry>> {
  const url = session?.jsession
    ? `${statusUrl()}&jsession=${encodeURIComponent(session.jsession)}`
    : statusUrl();
  const res = await fetch(url, { signal: signal ?? null });
  if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`Gateway local respondeu ${res.status}`);
  return parseSysStatus(await res.text());
}

/** Direct TCP media-server stream for a camera channel (1 = frontal, 2 = traseira). */
export function localStreamUrl(chn: 1 | 2, session?: ItoolSession | null) {
  const base = `${apBase()}:${LOCAL_MEDIA_PORT}?id=1001&type=0&action=1&stream=1&chn=${chn}`;
  return session?.jsession ? `${base}&jsession=${encodeURIComponent(session.jsession)}` : base;
}

export type StreamCandidate = { url: string; kind: "video" | "mjpeg" };

/**
 * Ordered list of local live-stream endpoints to try, in-app, for a channel.
 * Different camera firmwares expose different paths, so we fall through them.
 */
export function localStreamCandidates(
  chn: 1 | 2,
  session?: ItoolSession | null,
): StreamCandidate[] {
  const j = session?.jsession ? `&jsession=${encodeURIComponent(session.jsession)}` : "";
  return [
    { url: localStreamUrl(chn, session), kind: "video" },
    { url: `${apBase()}:${LOCAL_MEDIA_PORT}/live/ch${chn}${j ? `?${j.slice(1)}` : ""}`, kind: "video" },
    { url: `${apBase()}/action/stream?channel=${chn}${j}`, kind: "video" },
    { url: `${apBase()}/action/stream?channel=${chn}&type=mjpeg${j}`, kind: "mjpeg" },
    { url: `${apBase()}:${LOCAL_MEDIA_PORT}/mjpeg/ch${chn}`, kind: "mjpeg" },
  ];
}


export function localDownloadUrl(path: string, session?: ItoolSession | null) {
  const base = `${apBase()}/action/download?file=${encodeURIComponent(path)}`;
  return session?.jsession ? `${base}&jsession=${encodeURIComponent(session.jsession)}` : base;
}

export type LocalFile = {
  path: string;
  name: string;
  chn: 1 | 2;
  size?: string | undefined;
  duration?: string | undefined;
};

/** Lists MP4 files stored on the SD card. */
export async function listLocalFiles(
  session?: ItoolSession | null,
  signal?: AbortSignal,
): Promise<LocalFile[]> {
  const url = session?.jsession
    ? `${filesUrl()}&jsession=${encodeURIComponent(session.jsession)}`
    : filesUrl();
  const res = await fetch(url, { signal: signal ?? null });
  if (!res.ok) throw new Error(`Consulta SD falhou (${res.status})`);
  const text = await res.text();

  const paths = [
    ...text.matchAll(/(?:"(?:path|file|name)"\s*:\s*"|<(?:path|file|name)>)([^"<]+\.(?:mp4|MP4))/g),
  ].map((m) => m[1]!);

  return paths.map((p) => {
    const name = p.split(/[\\/]/).pop() ?? p;
    return {
      path: p,
      name,
      chn: /chn?2|_2_|CH2/i.test(name) ? (2 as const) : (1 as const),
    };
  });
}

/** Silent reachability probe for the camera gateway (no-cors: opaque response = reachable). */
export async function pingLocalGateway(signal?: AbortSignal): Promise<boolean> {
  const timeout = new AbortController();
  const id = setTimeout(() => timeout.abort(), 1500);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    await fetch(loginUrl(), { mode: "no-cors", cache: "no-store", signal: timeout.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
    signal?.removeEventListener("abort", onAbort);
  }
}

const hhmmss = (sec: number) => {
  const s = Math.max(0, Math.min(86399, Math.round(sec)));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
};

/** Continuous playback stream positioned at an absolute time of day (seconds). */
export function localPlaybackUrl(
  chn: 1 | 2,
  dayIso: string,
  startSec: number,
  session?: ItoolSession | null,
) {
  const base =
    `${apBase()}:${LOCAL_MEDIA_PORT}?id=1002&type=1&action=1&stream=1&chn=${chn}` +
    `&date=${dayIso}&begintime=${encodeURIComponent(hhmmss(startSec))}`;
  return session?.jsession ? `${base}&jsession=${encodeURIComponent(session.jsession)}` : base;
}

/** Download of a strictly bounded clip interval from the SD card. */
export function localClipUrl(
  chn: 1 | 2,
  dayIso: string,
  startSec: number,
  endSec: number,
  session?: ItoolSession | null,
) {
  const base =
    `${apBase()}/action/download?type=clip&chn=${chn}&date=${dayIso}` +
    `&begintime=${encodeURIComponent(hhmmss(startSec))}&endtime=${encodeURIComponent(hhmmss(endSec))}`;
  return session?.jsession ? `${base}&jsession=${encodeURIComponent(session.jsession)}` : base;
}
