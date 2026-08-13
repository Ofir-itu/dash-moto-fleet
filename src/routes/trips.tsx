import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Clock, Gauge, TriangleAlert } from "lucide-react";
import { TRIPS } from "@/lib/fleet-data";

const MotoMap = lazy(() => import("@/components/MotoMap"));

const TRIP_PATH: [number, number][] = [
  [-23.5875, -46.6392],
  [-23.5731, -46.6432],
  [-23.5613, -46.6565],
  [-23.5505, -46.6333],
  [-23.5613, -46.6565],
];

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "Trajetos — Ituran Moto" },
      {
        name: "description",
        content:
          "Histórico de trajetos da motocicleta com distância, duração, velocidade máxima e eventos de direção.",
      },
      { property: "og:title", content: "Trajetos — Ituran Moto" },
      { property: "og:description", content: "Histórico de rotas e eventos da frota de motos." },
    ],
  }),
  component: Trips,
});

function Trips() {
  const total = TRIPS.reduce((s, t) => s + t.distanceKm, 0);
  return (
    <div className="space-y-4">
      <section className="card-ituran overflow-hidden">
        <div className="h-56">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <MotoMap
                lat={TRIP_PATH[2]![0]}
                lng={TRIP_PATH[2]![1]}
                heading={90}
                path={TRIP_PATH}
                className="h-56 w-full"
              />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="px-4 py-3">
          <h1 className="font-display text-xl font-bold">Trajetos de hoje</h1>
          <p className="text-xs text-muted-foreground">
            {TRIPS.length} viagens · {total.toFixed(1)} km percorridos
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {TRIPS.map((t) => (
          <article key={t.id} className="card-ituran p-4">
            <p className="text-sm font-bold">
              {t.start} → {t.end}
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {t.durationMin} min
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" /> {t.maxSpeed} km/h
              </span>
              <span className="flex items-center gap-1">
                <TriangleAlert
                  className={`h-3.5 w-3.5 ${t.events ? "text-destructive" : "text-primary"}`}
                />
                {t.events} eventos
              </span>
              <span className="ml-auto hud-number text-sm text-foreground">{t.distanceKm} km</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
