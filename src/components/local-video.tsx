import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export const MIXED_CONTENT_HINT =
  "Aviso: Para visualizar o vídeo local no navegador, desative os Dados Móveis (4G/5G) no celular e mantenha o Wi-Fi da câmera conectado.";

type Props = {
  src: string | null;
  /** extra key parts that should force a fresh <video> element */
  streamKey?: string;
  className?: string;
  autoPlay?: boolean;
  /** shown when there is no src (e.g. not connected to the camera) */
  fallback?: React.ReactNode;
};

/**
 * Native HTML5 player for local AP-gateway streams. Chrome can block or refuse
 * these connections (mixed content / dual-interface routing), so load errors
 * are caught and surfaced with guidance plus a manual retry.
 */
export function LocalVideo({
  src,
  streamKey = "",
  className = "aspect-video w-full bg-navy",
  autoPlay = true,
  fallback,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!src) {
    return <div className={`grid place-items-center ${className}`}>{fallback}</div>;
  }

  return (
    <div className="relative">
      <video
        key={`${streamKey}-${attempt}`}
        src={src}
        controls
        muted
        playsInline
        autoPlay={autoPlay}
        onError={() => setFailed(true)}
        onPlaying={() => setFailed(false)}
        className={className}
      />
      {failed && (
        <div className="absolute inset-0 grid place-items-center gap-2 bg-navy/90 px-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-primary" />
          <p className="text-[11px] font-semibold leading-snug text-navy-foreground">
            {MIXED_CONTENT_HINT}
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="mx-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
