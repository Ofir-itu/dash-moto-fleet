export type LinkMode = "wifi" | "cloud";

export type Telemetry = {
  speedKmh: number;
  batteryVolts: number;
  lat: number;
  lng: number;
  headingDeg: number;
  ignition: boolean;
  tiltDeg: number;
  gForce: number;
  satellites: number;
  odometerKm: number;
};

export type Vehicle = {
  plate: string;
  model: string;
  rider: string;
};

export const VEHICLES: Vehicle[] = [
  { plate: "ABC-1234", model: "Honda CG 160 Cargo", rider: "M. Andrade" },
  { plate: "DMT-7788", model: "Yamaha Factor 150", rider: "J. Ribeiro" },
  { plate: "RQP-2C41", model: "Honda Biz 125", rider: "L. Ferreira" },
];

export const BASE_TELEMETRY: Telemetry = {
  speedKmh: 47,
  batteryVolts: 12.4,
  lat: -23.5613,
  lng: -46.6565,
  headingDeg: 68,
  ignition: true,
  tiltDeg: 6,
  gForce: 0.32,
  satellites: 11,
  odometerKm: 28461,
};

/** Deterministic-ish mock telemetry stepper (client-side only). */
export function stepTelemetry(t: Telemetry): Telemetry {
  const speed = Math.max(0, Math.min(112, t.speedKmh + (Math.random() * 14 - 7)));
  const heading = (t.headingDeg + (Math.random() * 10 - 5) + 360) % 360;
  const rad = (heading * Math.PI) / 180;
  const step = speed / 900000;
  return {
    ...t,
    speedKmh: Math.round(speed),
    headingDeg: Math.round(heading),
    lat: t.lat + Math.cos(rad) * step,
    lng: t.lng + Math.sin(rad) * step,
    batteryVolts: Math.round(Math.max(11.6, Math.min(14.2, t.batteryVolts + (Math.random() * 0.14 - 0.07))) * 10) / 10,
    tiltDeg: Math.round(Math.random() * 24),
    gForce: Math.round(Math.random() * 90) / 100,
    odometerKm: t.odometerKm + speed / 3600,
  };
}

export type AlertItem = {
  id: string;
  kind: "crash" | "harsh" | "speed" | "system" | "sos";
  title: string;
  detail: string;
  time: string;
  severity: "critical" | "warning" | "info";
};

export const ALERTS: AlertItem[] = [
  {
    id: "a1",
    kind: "harsh",
    title: "Frenagem brusca",
    detail: "Av. Paulista, 1.842 — 0.92 G registrado pelo sensor",
    time: "há 8 min",
    severity: "warning",
  },
  {
    id: "a2",
    kind: "speed",
    title: "Excesso de velocidade",
    detail: "82 km/h em via de 60 km/h — R. da Consolação",
    time: "há 42 min",
    severity: "warning",
  },
  {
    id: "a3",
    kind: "crash",
    title: "Possível colisão detectada",
    detail: "Inclinação 68° + impacto 3.1 G — vídeo de 20s enviado à nuvem",
    time: "ontem, 18:12",
    severity: "critical",
  },
  {
    id: "a4",
    kind: "system",
    title: "Tensão da bateria baixa",
    detail: "11.8V com ignição desligada por 6h",
    time: "ontem, 05:31",
    severity: "info",
  },
];

export type Trip = {
  id: string;
  start: string;
  end: string;
  distanceKm: number;
  durationMin: number;
  maxSpeed: number;
  events: number;
};

export const TRIPS: Trip[] = [
  { id: "t1", start: "Base Vila Mariana", end: "Cliente — Bela Vista", distanceKm: 7.4, durationMin: 23, maxSpeed: 61, events: 1 },
  { id: "t2", start: "Bela Vista", end: "Centro — Sé", distanceKm: 3.1, durationMin: 12, maxSpeed: 48, events: 0 },
  { id: "t3", start: "Centro — Sé", end: "Pinheiros", distanceKm: 11.8, durationMin: 34, maxSpeed: 82, events: 2 },
  { id: "t4", start: "Pinheiros", end: "Base Vila Mariana", distanceKm: 9.6, durationMin: 28, maxSpeed: 57, events: 0 },
];

export type Recording = {
  id: string;
  cam: "Frontal" | "Traseira";
  label: string;
  duration: string;
  size: string;
  locked: boolean;
};

export const RECORDINGS: Recording[] = [
  { id: "r1", cam: "Frontal", label: "Evento de colisão", duration: "00:20", size: "18 MB", locked: true },
  { id: "r2", cam: "Traseira", label: "Frenagem brusca", duration: "00:15", size: "12 MB", locked: true },
  { id: "r3", cam: "Frontal", label: "Gravação contínua 18:00", duration: "05:00", size: "142 MB", locked: false },
  { id: "r4", cam: "Traseira", label: "Gravação contínua 18:05", duration: "05:00", size: "138 MB", locked: false },
];
