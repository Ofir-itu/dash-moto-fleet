import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  FolderOpen,
  Map as MapIcon,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { useFleet } from "@/components/fleet-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Moto — Painel da câmera e telemetria da moto" },
      {
        name: "description",
        content:
          "Painel",
      },
      { property: "og:title", content: "Moto — Painel da câmera e telemetria da moto" },
      {
        property: "og:description",
        content: "Painel",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const LAUNCHERS = [
  {
    to: "/live",
    label: "Câmeras ao Vivo",
    sub: "Transmissão frontal e traseira em tempo real",
    icon: Camera,
  },
  {
    to: "/sd-videos",
    label: "Vídeos SD",
    sub: "Gravações e eventos salvos no cartão SD",
    icon: FolderOpen,
  },
  {
    to: "/trajetos",
    label: "Trajetos",
    sub: "Histórico de rotas e localização",
    icon: MapIcon,
  },
  {
    to: "/alertas",
    label: "Alertas e Saúde",
    sub: "Diagnóstico da bateria e sensores",
    icon: ShieldAlert,
  },
] as const;

function Dashboard() {
  const { telemetry, vehicle } = useFleet();
  const [sosArmed, setSosArmed] = useState(false);

  return (
    <div className="space-y-4">
      <section className="card-ituran p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-bold tracking-wide">{vehicle.plate}</p>
            <p className="text-xs text-muted-foreground">
              {vehicle.model} · {vehicle.rider}
            </p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              telemetry.ignition
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Radio className="h-3 w-3" />
            {telemetry.ignition ? "Online" : "Offline"}
          </span>
        </div>

      </section>


      <section className="grid grid-cols-2 gap-3">
        {LAUNCHERS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="card-ituran flex min-h-40 flex-col justify-between p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raise)] active:scale-[0.97]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-navy">
              <a.icon className="h-6 w-6" />
            </span>
            <div className="mt-3">
              <p className="font-display text-base font-bold leading-tight">{a.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{a.sub}</p>
            </div>
          </Link>
        ))}
      </section>

      <button
        type="button"
        onClick={() => setSosArmed((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-4 text-base font-bold text-destructive-foreground shadow-[0_14px_34px_-14px_rgba(229,57,53,0.8)] active:scale-[0.99]"
      >
        <AlertTriangle className="h-5 w-5" />
        {sosArmed ? "SOS ENVIADO — CENTRAL NOTIFICADA" : "EMERGÊNCIA SOS"}
      </button>
    </div>
  );
}
