import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import type { StreamCandidate } from "@/lib/wifi-direct";

type Props = {
  candidates: StreamCandidate[];
  className?: string;
  /** rendered when there is no source at all (not connected) */
  fallback?: React.ReactNode;
};

/**
 * In-app live stream renderer. Tries each local endpoint in order (native
 * HTML5 video first, then MJPEG image buffer) and never leaves the app:
 * failures surface as an inline overlay with a manual reload.
 */
export function StreamPlayer({ candidates, className = "h-44 w-full bg-navy object-cover", fallback }: Props) {
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [live, setLive] = useState(false);

  const key = candidates.map((c) => c.url).join("|");
  useEffect(() => {
    setIndex(0);
    setLive(false);
  }, [key]);

  if (candidates.length === 0) {
    return <div className={`grid place-items-center ${className}`}>{fallback}</div>;
  }

  const exhausted = index >= candidates.length;
  const current = exhausted ? undefined : candidates[index];

  const onFail = () => {
    setLive(false);
    setIndex((i) => i + 1);
  };

  const reload = () => {
    setLive(false);
    setIndex(0);
    setEpoch((e) => e + 1);
  };

  return (
    <div className="relative">
      {current ? (
        current.kind === "mjpeg" ? (
          <img
            key={`${epoch}-${index}`}
            src={`${current.url}${current.url.includes("?") ? "&" : "?"}_=${epoch}`}
            alt="Transmissão ao vivo da câmera local"
            onLoad={() => setLive(true)}
            onError={onFail}
            className={className}
          />
        ) : (
          <video
            key={`${epoch}-${index}`}
            src={current.url}
            controls
            muted
            playsInline
            autoPlay
            onPlaying={() => setLive(true)}
            onError={onFail}
            className={className}
          />
        )
      ) : (
        <div className={className} />
      )}

      {!live && (
        <div className="absolute inset-0 grid place-items-center gap-2 bg-navy/80 px-4 text-center">
          {!exhausted ? (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-navy-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Reconectando stream local...
            </p>
          ) : (
            <p className="text-[11px] font-semibold leading-snug text-navy-foreground">
              Não foi possível abrir o stream local. Verifique o Wi-Fi AP da câmera.
            </p>
          )}
          <button
            type="button"
            onClick={reload}
            className="mx-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recarregar
          </button>
        </div>
      )}
    </div>
  );
}
