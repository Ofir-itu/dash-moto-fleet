import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Play, Signal } from "lucide-react";

import { useFleet } from "@/components/fleet-shell";
import { StreamPlayer } from "@/components/stream-player";

import {
  listLocalFiles,
  localStreamCandidates,
  localHost,
  type ItoolSession,
  type LocalFile,
} from "@/lib/wifi-direct";


export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Câmeras ao Vivo — Ituran Moto" },
      {
        name: "description",
        content:
          "Transmissão ao vivo das câmeras frontal e traseira da motocicleta e acesso às gravações do cartão SD.",
      },
      { property: "og:title", content: "Câmeras ao Vivo — Ituran Moto" },
      {
        property: "og:description",
        content: "Vídeo ao vivo e gravações SD da frota de motocicletas.",
      },
    ],
  }),
  component: LiveView,
});

function CamTile({
  name,
  chn,
  session,
  local,
}: {
  name: string;
  chn: 1 | 2;
  session: ItoolSession | null;
  local: boolean;
}) {
  const candidates = local ? localStreamCandidates(chn, session) : [];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy">
      <StreamPlayer
        candidates={candidates}
        className="h-44 w-full bg-navy object-cover"
        fallback={
          <div className="flex h-44 w-full items-center justify-center">
            <Camera className="h-8 w-8 text-navy-foreground/40" />
          </div>
        }
      />

      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-white" /> AO VIVO
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 text-xs font-semibold text-navy-foreground">
        {name}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-navy-foreground/70">
        <Signal className="h-3 w-3 text-primary" /> 720p · 25fps
      </div>
    </div>
  );
}


function LiveView() {
  const { linkMode, localSession } = useFleet();
  const local = linkMode === "wifi" && !!localSession;
  const [files, setFiles] = useState<LocalFile[] | null>(null);

  useEffect(() => {
    if (!local) {
      setFiles(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    void listLocalFiles(localSession, controller.signal)
      .then((f) => {
        if (!cancelled) setFiles(f);
      })
      .catch(() => {
        if (!cancelled) setFiles(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [local, localSession]);

  return (
    <div className="space-y-4">
      <section className="card-ituran p-4">
        <h1 className="font-display text-xl font-bold">Câmeras ao Vivo</h1>
        <p className="text-xs text-muted-foreground">
          Stream via{" "}
          {`Wi-Fi AP da câmera · ${localHost()}:5677`}
        </p>
        <div className="mt-3 space-y-3">
          <CamTile name="Frontal (CH1)" chn={1} session={localSession} local={local} />
          <CamTile name="Traseira (CH2)" chn={2} session={localSession} local={local} />
        </div>
      </section>

      <section className="card-ituran p-4">
        <h2 className="font-display text-lg font-bold">Vídeos SD</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {files ? `${files.length} arquivo(s) no cartão SD` : "Gravações salvas no cartão SD"}
        </p>
        <Link
          to="/sd-videos"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-navy-foreground active:scale-[0.99]"
        >
          <Play className="h-4 w-4 text-primary" />
          Abrir gravações
        </Link>
      </section>

    </div>
  );
}
