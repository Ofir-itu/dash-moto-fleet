import type { Telemetry } from "@/lib/fleet-data";

export const VSS_WS_URL = "wss://www.ituran.video/ws";
export const VSS_WS_PORT = 36301;

export const VSS_ACTION = {
  LOGIN: 80000,
  SUBSCRIBE: 80001,
  DATA: 80003,
  HEARTBEAT: 80009,
} as const;

export type VssStatus = "idle" | "connecting" | "online" | "error" | "closed";

type Handlers = {
  onTelemetry: (patch: Partial<Telemetry>) => void;
  onStatus: (status: VssStatus, message?: string) => void;
};

/** Maps an action:80003 payload onto the HUD telemetry shape. */
export function mapVssPayload(payload: Record<string, any>): Partial<Telemetry> {
  const loc = payload["location"] ?? {};
  const g = payload["gsensor"] ?? {};
  const voltage = payload["voltage"] ?? payload["devVoltage"];
  const patch: Partial<Telemetry> = {};

  if (loc.speed != null) patch.speedKmh = Math.round(Number(loc.speed));
  if (loc.latitude != null) patch.lat = Number(loc.latitude);
  if (loc.longitude != null) patch.lng = Number(loc.longitude);
  if (loc.direct != null) patch.headingDeg = Math.round(Number(loc.direct));
  if (loc.satellites != null) patch.satellites = Number(loc.satellites);
  if (voltage != null) patch.batteryVolts = Math.round(Number(voltage) * 10) / 10;
  if (payload["acc"] != null) patch.ignition = Boolean(Number(payload["acc"]));
  if (g.tilt != null) patch.tiltDeg = Math.round(Number(g.tilt));
  if (g.hit != null) patch.gForce = Number(g.hit);

  return patch;
}

export class VssSocket {
  private ws: WebSocket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private closedByUser = false;

  constructor(
    private session: { token: string; pid: string },
    private handlers: Handlers,
  ) {}

  connect() {
    this.closedByUser = false;
    this.handlers.onStatus("connecting");
    try {
      this.ws = new WebSocket(VSS_WS_URL);
    } catch {
      this.handlers.onStatus("error", "Falha ao abrir o WebSocket seguro.");
      return;
    }

    this.ws.onopen = () => {
      // 1) login handshake
      this.send({ action: VSS_ACTION.LOGIN, token: this.session.token, pid: this.session.pid });
      // 2) subscribe to live telemetry
      this.send({ action: VSS_ACTION.SUBSCRIBE, pid: this.session.pid });
      this.handlers.onStatus("online");
      // 3) heartbeat every 60s
      this.heartbeat = setInterval(
        () => this.send({ action: VSS_ACTION.HEARTBEAT, pid: this.session.pid }),
        60_000,
      );
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Record<string, any>;
        if (Number(msg["action"]) === VSS_ACTION.DATA) {
          this.handlers.onTelemetry(mapVssPayload(msg["data"] ?? msg));
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    this.ws.onerror = () => this.handlers.onStatus("error", "Erro na conexão com a nuvem VSS.");
    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.handlers.onStatus(this.closedByUser ? "closed" : "error", "Conexão VSS encerrada.");
    };
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  close() {
    this.closedByUser = true;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }
}
