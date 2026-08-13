import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BatteryMedium,
  Gauge,
  HardDrive,
  PlayCircle,
  Satellite,
  ShieldAlert,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useFleet } from "@/components/fleet-shell";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alertas e Saúde — Ituran Moto" },
      {
        name: "description",
        content:
          "Diagnóstico local da câmera e da motocicleta: tensão da bateria, saúde do cartão SD, GPS e G-sensor, além dos últimos eventos de segurança registrados pela câmera local.",
      },
      { property: "og:title", content: "Alertas e Saúde — Ituran Moto" },
      {
        property: "og:description",
        content: "Diagnóstico local da câmera e eventos de segurança da motocicleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Alerts,
});

type SafetyEvent = {
  id: string;
  kind: "impact" | "harsh" | "speed" | "battery";
  title: string;
  severity: "alta" | "media";
  time: string;
  location: string;
  at: number; // seconds within the day, for the SD timeline
};

const EVENTS: SafetyEvent[] = [
  {
    id: "ev1",
    kind: "harsh",
    title: "Frenagem brusca",
    severity: "media",
    time: "Hoje às 14:32",
    location: "Av. Paulista, 1.842 — São Paulo",
    at: 14 * 3600 + 1930,
  },
  {
    id: "ev2",
    kind: "speed",
    title: "Excesso de velocidade",
    severity: "media",
    time: "Hoje às 12:07",
    location: "R. Augusta, 980 — São Paulo",
    at: 12 * 3600 + 420,
  },
  {
    id: "ev3",
    kind: "impact",
    title: "Possível colisão",
    severity: "alta",
    time: "Hoje às 09:30",
    location: "R. da Consolação, 2.115 — São Paulo",
    at: 9 * 3600 + 1830,
  },
  {
    id: "ev4",
    kind: "battery",
    title: "Tensão de bateria baixa",
    severity: "media",
    time: "Hoje às 07:48",
    location: "Garagem — Vila Mariana",
    at: 7 * 3600 + 2880,
  },
];

const EVENT_ICONS: Record<SafetyEvent["kind"], React.ComponentType<{ className?: string }>> = {
  impact: ShieldAlert,
  harsh: TrendingDown,
  speed: Gauge,
  battery: Zap,
};

const SD_TOTAL = 128;
const SD_FREE = 64;

function Alerts() {
  const { telemetry, lowBattery } = useFleet();
  const volts = telemetry.batteryVolts.toFixed(1);
  const sdPct = Math.round(((SD_TOTAL - SD_FREE) / SD_TOTAL) * 100);
  const gpsStrong = telemetry.satellites >= 7;
  const batteryHealthy = !lowBattery;

  return (
    <div className="space-y-4">
      <section>
        <h1 className="font-display text-xl font-bold text-navy">Alertas</h1>
        <p className="text-xs text-muted-foreground">
          Eventos de segurança registrados pela câmera local
        </p>
      </section>

      {/* Battery health */}
      <section className="card-ituran p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
              <BatteryMedium className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Saúde da bateria
              </p>
              <p className="font-display text-lg font-bold text-navy">
                {volts}V • {batteryHealthy ? "Bateria Saudável" : "Bateria Baixa"}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
              batteryHealthy
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                batteryHealthy ? "bg-primary-foreground" : "bg-destructive-foreground"
              }`}
            />
            {batteryHealthy ? "Saudável" : "Atenção"}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${batteryHealthy ? "bg-primary" : "bg-destructive"}`}
            style={{
              width: `${Math.max(4, Math.min(100, ((telemetry.batteryVolts - 10) / 4.5) * 100))}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Faixa saudável: 11,5V – 14,4V (leitura local via câmera no modo AP)
        </p>
      </section>

      {/* SD card health */}
      <section className="card-ituran p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-navy/10 text-navy">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status do Cartão SD
              </p>
              <p className="text-sm font-bold text-navy">
                Normal ({SD_FREE} GB disponíveis)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
            <span className="h-2 w-2 rounded-full bg-primary-foreground" />
            OK
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-navy" style={{ width: `${sdPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {sdPct}% utilizado · {SD_FREE} GB livres de {SD_TOTAL} GB · gravação em loop ativa
        </p>
      </section>

      {/* Sensors */}
      <section className="grid grid-cols-2 gap-3">
        <article className="card-ituran p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy/10 text-navy">
            <Satellite className="h-5 w-5" />
          </span>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sinal GPS
          </p>
          <p className="text-sm font-bold text-navy">{gpsStrong ? "Forte" : "Fraco"}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <span
              className={`h-2 w-2 rounded-full ${gpsStrong ? "bg-primary" : "bg-destructive"}`}
            />
            {telemetry.satellites} satélites
          </span>
        </article>
        <article className="card-ituran p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy/10 text-navy">
            <Activity className="h-5 w-5" />
          </span>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            G-Sensor
          </p>
          <p className="text-sm font-bold text-navy">Ativo</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {telemetry.gForce.toFixed(2)} G atual
          </span>
        </article>
      </section>

      {/* Safety events feed */}
      <section className="space-y-3">
        <h2 className="px-1 font-display text-base font-bold text-navy">
          Últimos Eventos de Segurança
        </h2>
        {EVENTS.map((e) => {
          const Icon = EVENT_ICONS[e.kind];
          const high = e.severity === "alta";
          return (
            <article key={e.id} className="card-ituran p-4">
              <div className="flex gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    high ? "bg-destructive/15 text-destructive" : "bg-navy/10 text-navy"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-navy">{e.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        high
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {high ? "Alta" : "Média"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{e.time}</p>
                  <p className="text-xs text-muted-foreground">{e.location}</p>
                </div>
              </div>
              <Link
                to="/sd-videos"
                search={{ t: e.at }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              >
                <PlayCircle className="h-4 w-4" />
                Ver vídeo
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
