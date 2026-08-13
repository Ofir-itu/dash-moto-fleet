import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  MapPin,
  Route as RouteIcon,
  TriangleAlert,
} from "lucide-react";
import type { TripEventMarker } from "@/components/TripMap";

const TripMap = lazy(() => import("@/components/TripMap"));

export const Route = createFileRoute("/trajetos")({
  head: () => ({
    meta: [
      { title: "Histórico de Trajetos — Ituran Moto" },
      {
        name: "description",
        content:
          "Rotas GPS das viagens da motocicleta com distância, duração, velocidade máxima e eventos de sensor no mapa.",
      },
      { property: "og:title", content: "Histórico de Trajetos — Ituran Moto" },
      {
        property: "og:description",
        content: "Visualize a rota de cada viagem da moto com marcadores de início, fim e eventos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trajetos,
});

type LocalTrip = {
  id: string;
  label: string;
  window: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  maxSpeed: number;
  avgSpeed: number;
  path: [number, number][];
  events: TripEventMarker[];
};

const TRAJETOS: LocalTrip[] = [
  {
    id: "v1",
    label: "Viagem 1",
    window: "Hoje 08:30 às 09:15",
    from: "Base Vila Mariana",
    to: "Cliente — Bela Vista",
    distanceKm: 14.2,
    durationMin: 28,
    maxSpeed: 78,
    avgSpeed: 42,
    path: [
      [-23.5875, -46.6392],
      [-23.5814, -46.6421],
      [-23.5731, -46.6432],
      [-23.5668, -46.6498],
      [-23.5613, -46.6565],
      [-23.5561, -46.6521],
    ],
    events: [
      { lat: -23.5731, lng: -46.6432, label: "Frenagem brusca", time: "08:52" },
      { lat: -23.5613, lng: -46.6565, label: "Impacto detectado", time: "09:04" },
    ],
  },
  {
    id: "v2",
    label: "Viagem 2",
    window: "Hoje 14:10 às 14:45",
    from: "Bela Vista",
    to: "Pinheiros",
    distanceKm: 9.6,
    durationMin: 35,
    maxSpeed: 61,
    avgSpeed: 33,
    path: [
      [-23.5561, -46.6521],
      [-23.5548, -46.6672],
      [-23.5599, -46.6821],
      [-23.5661, -46.6935],
    ],
    events: [{ lat: -23.5599, lng: -46.6821, label: "Curva agressiva", time: "14:31" }],
  },
  {
    id: "v3",
    label: "Viagem 3",
    window: "Hoje 18:05 às 18:33",
    from: "Pinheiros",
    to: "Base Vila Mariana",
    distanceKm: 11.8,
    durationMin: 28,
    maxSpeed: 82,
    avgSpeed: 39,
    path: [
      [-23.5661, -46.6935],
      [-23.5735, -46.6752],
      [-23.5808, -46.6577],
      [-23.5875, -46.6392],
    ],
    events: [],
  },
];

function Trajetos() {
  const [index, setIndex] = useState(0);
  const trip = TRAJETOS[index]!;

  const metrics = [
    { icon: RouteIcon, label: "Distância", value: `${trip.distanceKm.toFixed(1)} km` },
    { icon: Clock, label: "Duração", value: `${trip.durationMin} min` },
    { icon: Gauge, label: "Vel. máxima", value: `${trip.maxSpeed} km/h` },
    { icon: Gauge, label: "Vel. média", value: `${trip.avgSpeed} km/h` },
  ];

  return (
    <div className="space-y-4">
      <section className="card-ituran p-4">
        <h1 className="font-display text-xl font-bold text-navy">Histórico de Trajetos</h1>
        <p className="text-xs text-muted-foreground">
          Rotas GPS registradas localmente pela câmera da moto
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Viagem anterior"
            onClick={() => setIndex((i) => (i - 1 + TRAJETOS.length) % TRAJETOS.length)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-navy"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <label className="min-w-0 flex-1">
            <span className="sr-only">Selecionar viagem</span>
            <select
              value={trip.id}
              onChange={(e) => setIndex(TRAJETOS.findIndex((t) => t.id === e.target.value))}
              className="w-full truncate rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold text-navy"
            >
              {TRAJETOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} • {t.window}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            aria-label="Próxima viagem"
            onClick={() => setIndex((i) => (i + 1) % TRAJETOS.length)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-navy"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="card-ituran overflow-hidden">
        <div className="h-64">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <TripMap path={trip.path} events={trip.events} className="h-64 w-full" />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="space-y-2 px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="font-semibold text-navy">Início do trajeto</span>
            <span className="truncate text-muted-foreground">{trip.from}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span className="font-semibold text-navy">Fim do trajeto</span>
            <span className="truncate text-muted-foreground">{trip.to}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card-ituran p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <m.icon className="h-3.5 w-3.5 text-navy" />
              {m.label}
            </div>
            <p className="mt-1 font-display text-lg font-bold text-navy">{m.value}</p>
          </div>
        ))}
        <div className="card-ituran col-span-2 flex items-center gap-3 p-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10">
            <TriangleAlert className="h-4 w-4 text-destructive" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground">Eventos de segurança</p>
            <p className="font-display text-lg font-bold text-navy">
              {trip.events.length} {trip.events.length === 1 ? "evento" : "eventos"}
            </p>
          </div>
        </div>
      </section>

      {trip.events.length > 0 ? (
        <section className="card-ituran p-4">
          <h2 className="font-display text-sm font-bold text-navy">Eventos no trajeto</h2>
          <ul className="mt-2 divide-y divide-border">
            {trip.events.map((ev) => (
              <li key={`${ev.label}-${ev.time}`} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10">
                  <MapPin className="h-4 w-4 text-destructive" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{ev.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {ev.time} · {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
