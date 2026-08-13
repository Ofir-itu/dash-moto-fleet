import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Scissors, Video } from "lucide-react";
import { useFleet } from "@/components/fleet-shell";
import { localClipUrl, localPlaybackUrl } from "@/lib/wifi-direct";
import { StreamPlayer } from "@/components/stream-player";


export const Route = createFileRoute("/sd-videos")({
  head: () => ({
    meta: [
      { title: "Vídeos do Cartão SD — Ituran Moto" },
      {
        name: "description",
        content:
          "Linha do tempo contínua das gravações do cartão SD da câmera da moto, com seleção de trecho e download direto.",
      },
      { property: "og:title", content: "Vídeos do Cartão SD — Ituran Moto" },
      {
        property: "og:description",
        content: "Reproduza a linha do tempo da câmera e baixe trechos exatos para o celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { t?: number } => {
    const raw = Number(search["t"]);
    return Number.isFinite(raw) ? { t: raw } : {};
  },
  component: SdVideos,

});

const DAY = 86400;
const PX_PER_HOUR = 140;
const TIMELINE_W = 24 * PX_PER_HOUR;

type Band = { start: number; end: number; kind: "loop" | "event" };
type EventMark = { id: string; label: string; at: number };

const BANDS: Band[] = [
  { start: 7 * 3600, end: 9 * 3600 + 1800, kind: "loop" },
  { start: 9 * 3600 + 1800, end: 9 * 3600 + 1860, kind: "event" },
  { start: 9 * 3600 + 1860, end: 12 * 3600, kind: "loop" },
  { start: 13 * 3600, end: 14 * 3600 + 1930, kind: "loop" },
  { start: 14 * 3600 + 1930, end: 14 * 3600 + 1990, kind: "event" },
  { start: 14 * 3600 + 1990, end: 18 * 3600 + 600, kind: "loop" },
  { start: 18 * 3600 + 600, end: 18 * 3600 + 660, kind: "event" },
  { start: 18 * 3600 + 660, end: 20 * 3600, kind: "loop" },
];

const EVENTS: EventMark[] = [
  { id: "e1", label: "Frenagem brusca", at: 9 * 3600 + 1830 },
  { id: "e2", label: "Colisão", at: 14 * 3600 + 1930 },
  { id: "e3", label: "SOS acionado", at: 18 * 3600 + 600 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const clockOf = (sec: number) =>
  `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(Math.round(sec) % 60)}`;
const shortClock = (sec: number) =>
  `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}`;
const durationOf = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return s >= 3600
    ? `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
    : `${pad(Math.floor(s / 60))}:${pad(s % 60)}s`;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function SdVideos() {
  const { linkMode, localSession } = useFleet();
  const local = linkMode === "wifi" && !!localSession;
  const dayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { t } = Route.useSearch();
  const initial = typeof t === "number" && t >= 0 && t < DAY ? t : 14 * 3600 + 1900;

  const [chn, setChn] = useState<1 | 2>(1);
  const [cursor, setCursor] = useState(initial);
  const [range, setRange] = useState({ start: initial, end: initial + 45 });

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<"cursor" | "start" | "end" | null>(null);

  const playbackUrl = local ? localPlaybackUrl(chn, dayIso, cursor, localSession) : null;
  const clipUrl = local
    ? localClipUrl(chn, dayIso, range.start, range.end, localSession)
    : null;

  const secondsAt = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * DAY, 0, DAY);
  }, []);

  const applyDrag = useCallback(
    (sec: number) => {
      const mode = dragRef.current;
      if (mode === "start") setRange((r) => ({ ...r, start: Math.min(sec, r.end - 1) }));
      else if (mode === "end") setRange((r) => ({ ...r, end: Math.max(sec, r.start + 1) }));
      else setCursor(sec);
    },
    [],
  );

  const onPointerDown = (mode: "cursor" | "start" | "end") => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = mode;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    applyDrag(secondsAt(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    applyDrag(secondsAt(e.clientX));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const jumpTo = (at: number) => {
    setCursor(at);
    setRange({ start: at, end: Math.min(DAY, at + 45) });
    const el = trackRef.current?.parentElement;
    if (el) el.scrollTo({ left: (at / DAY) * TIMELINE_W - el.clientWidth / 2, behavior: "smooth" });
  };

  const pct = (sec: number) => `${(sec / DAY) * 100}%`;

  return (
    <div className="space-y-4">
      <section className="card-ituran overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <h1 className="font-display text-xl font-bold text-navy">Vídeos do Cartão SD</h1>
            <p className="text-xs text-muted-foreground">
              Linha do tempo contínua · {dayIso.split("-").reverse().join("/")}
            </p>
          </div>
          <div className="flex rounded-xl bg-muted p-1">
            {([1, 2] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChn(c)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                  chn === c ? "bg-navy text-navy-foreground" : "text-muted-foreground"
                }`}
              >
                {c === 1 ? "Frontal" : "Traseira"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-navy">
          <StreamPlayer
            candidates={playbackUrl ? [{ url: playbackUrl, kind: "video" as const }] : []}
            className="aspect-video w-full bg-navy"
            fallback={
              <div className="grid aspect-video w-full place-items-center gap-2 text-center text-xs text-navy-foreground/70">
                <Video className="mx-auto h-6 w-6 text-primary" />
                Reprodução em {clockOf(cursor)} · {chn === 1 ? "Frontal" : "Traseira"}
                <br />
                Conecte-se à câmera por Wi-Fi AP para reproduzir.
              </div>
            }
          />
        </div>



        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-navy">{clockOf(cursor)}</span>
            <span className="text-muted-foreground">Arraste a régua para navegar</span>
          </div>

          <div className="mt-2 overflow-x-auto pb-2">
            <div
              ref={trackRef}
              onPointerDown={onPointerDown("cursor")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative h-24 touch-none select-none rounded-xl bg-muted"
              style={{ width: TIMELINE_W }}
            >
              {/* minute + hour ticks */}
              {Array.from({ length: 24 * 4 + 1 }, (_, i) => {
                const sec = i * 900;
                const hour = i % 4 === 0;
                return (
                  <span
                    key={i}
                    className={`absolute top-0 w-px ${hour ? "h-5 bg-navy/40" : "h-2.5 bg-navy/15"}`}
                    style={{ left: pct(sec) }}
                  />
                );
              })}
              {Array.from({ length: 25 }, (_, h) => (
                <span
                  key={`l${h}`}
                  className="absolute top-5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                  style={{ left: pct(h * 3600) }}
                >
                  {pad(h)}:00
                </span>
              ))}

              {/* recording bands */}
              {BANDS.map((b, i) => (
                <span
                  key={i}
                  className={`absolute top-11 h-6 rounded-sm ${
                    b.kind === "event" ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ left: pct(b.start), width: pct(b.end - b.start) }}
                />
              ))}

              {/* selected range */}
              <span
                className="absolute top-9 h-10 rounded-sm border-2 border-navy bg-navy/15"
                style={{ left: pct(range.start), width: pct(range.end - range.start) }}
              />

              {/* handles */}
              {(["start", "end"] as const).map((k) => (
                <span
                  key={k}
                  onPointerDown={onPointerDown(k)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  role="slider"
                  tabIndex={0}
                  aria-label={k === "start" ? "Início do trecho" : "Fim do trecho"}
                  aria-valuenow={Math.round(range[k])}
                  aria-valuemin={0}
                  aria-valuemax={DAY}
                  className="absolute top-8 grid h-12 w-4 -translate-x-1/2 cursor-ew-resize touch-none place-items-center rounded-md bg-navy text-[8px] font-bold text-navy-foreground"
                  style={{ left: pct(range[k]) }}
                >
                  {k === "start" ? "I" : "F"}
                </span>
              ))}

              {/* playhead */}
              <span
                className="pointer-events-none absolute top-7 h-14 w-0.5 -translate-x-1/2 bg-destructive"
                style={{ left: pct(cursor) }}
              >
                <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-destructive" />
              </span>

              {/* event pins */}
              {EVENTS.map((ev) => (
                <span
                  key={ev.id}
                  className="pointer-events-none absolute bottom-1 -translate-x-1/2 rounded bg-destructive/10 px-1 font-mono text-[9px] font-bold text-destructive"
                  style={{ left: pct(ev.at) }}
                >
                  {shortClock(ev.at)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-primary" /> Contínuo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-destructive" /> Evento
            </span>
          </div>
        </div>
      </section>

      <section className="card-ituran space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-navy" />
          <h2 className="font-display text-sm font-bold text-navy">Exportar trecho</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[10px] font-semibold text-muted-foreground">Início</p>
            <p className="font-mono text-sm font-bold text-navy">{clockOf(range.start)}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[10px] font-semibold text-muted-foreground">Fim</p>
            <p className="font-mono text-sm font-bold text-navy">{clockOf(range.end)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Duração selecionada:{" "}
          <span className="font-mono font-bold text-navy">{durationOf(range.end - range.start)}</span>
        </p>
        <a
          href={clipUrl ?? "#"}
          download
          onClick={(e) => {
            if (!clipUrl) e.preventDefault();
          }}
          aria-disabled={!clipUrl}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
            clipUrl
              ? "bg-primary text-primary-foreground"
              : "pointer-events-none bg-muted text-muted-foreground"
          }`}
        >
          <Download className="h-4 w-4" />
          Baixar trecho selecionado
        </a>
        {!clipUrl ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Conecte-se à câmera para exportar o trecho.
          </p>
        ) : null}
      </section>

      <section className="card-ituran p-4">
        <h2 className="font-display text-sm font-bold text-navy">Eventos detectados</h2>
        <ul className="mt-2 divide-y divide-border">
          {EVENTS.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => jumpTo(ev.at)}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy">{ev.label}</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {clockOf(ev.at)} · {chn === 1 ? "Câmera Frontal" : "Câmera Traseira"}
                  </span>
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold text-navy">
                  Ir para
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
