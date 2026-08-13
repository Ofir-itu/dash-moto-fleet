import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BatteryMedium,
  ChevronDown,
  Gauge,
  Cloud,
  FolderOpen,
  KeyRound,
  Loader2,
  Settings,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { VEHICLES, type LinkMode, type Telemetry, type Vehicle } from "@/lib/fleet-data";
import { useVssLink, type LinkState } from "@/hooks/use-vss-link";
import { DEFAULT_LOCAL_PASSWORD, pingLocalGateway, type ItoolSession } from "@/lib/wifi-direct";
import ituranLogo from "@/assets/ituran-logo-light.png";

type FleetContextValue = {
  telemetry: Telemetry;
  vehicle: Vehicle;
  linkMode: LinkMode;
  setLinkMode: (m: LinkMode) => void;
  link: LinkState;
  lowBattery: boolean;
  crash: boolean;
  localSession: ItoolSession | null;
};


const FleetContext = createContext<FleetContextValue | null>(null);

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used inside FleetShell");
  return ctx;
}

const TABS = [
  { to: "/", label: "Início", icon: Gauge },
  { to: "/live", label: "Ao Vivo", icon: Video },
  { to: "/sd-videos", label: "Vídeos SD", icon: FolderOpen },
  { to: "/settings", label: "Ajustes", icon: Settings },
] as const;


export function FleetShell({ children }: { children: ReactNode }) {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [linkMode, setLinkMode] = useState<LinkMode>("wifi");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    telemetry,
    link,
    lowBattery,
    crash,
    localSession,
    isConnected,
    needsLocalLogin,
    localError,
    localBusy,
    loginLocal,
    dismissLocalLogin,
    reopenLocalLogin,
  } = useVssLink(linkMode);
  const [password, setPassword] = useState(DEFAULT_LOCAL_PASSWORD);
  const [cameraReachable, setCameraReachable] = useState<boolean | null>(null);

  // Preload the browser-only map modules right after hydration so every route
  // is already in memory and navigation works with no network access.
  useEffect(() => {
    void import("@/components/MotoMap");
    void import("@/components/TripMap");
  }, []);



  // Non-blocking, informational only: never gates the "Entrar" action.
  useEffect(() => {
    if (!needsLocalLogin) {
      setCameraReachable(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const tick = async () => {
      const ok = await pingLocalGateway(controller.signal);
      if (!cancelled) setCameraReachable(ok);
    };
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [needsLocalLogin]);

  const vehicle = VEHICLES[vehicleIndex]!;
  const value = useMemo(
    () => ({ telemetry, vehicle, linkMode, setLinkMode, link, lowBattery, crash, localSession }),
    [telemetry, vehicle, linkMode, link, lowBattery, crash, localSession],
  );

  const voltage = telemetry.batteryVolts;
  const voltageTone =
    voltage < 11.5 ? "text-destructive" : voltage < 12.3 ? "text-amber-400" : "text-primary";

  const wifiOnline = linkMode === "wifi" && isConnected;

  return (

    <FleetContext.Provider value={value}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
        <header className="sticky top-0 z-30 bg-navy px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <img
              src={ituranLogo}
              alt="Ituran"
              className="h-8 w-auto object-contain"
              style={{ objectFit: "contain" }}
            />
            <button
              type="button"
              onClick={() => setLinkMode(linkMode === "wifi" ? "cloud" : "wifi")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                wifiOnline
                  ? "bg-primary text-primary-foreground"
                  : linkMode === "wifi"
                    ? "bg-muted text-muted-foreground"
                    : "bg-cloud text-cloud-foreground"
              }`}
            >
              {linkMode === "wifi" ? <Wifi className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
              {linkMode === "wifi" ? (wifiOnline ? "Wi-Fi AP On-line" : "Wi-Fi AP") : "Simulação"}
            </button>

          </div>

          <div className="card-ituran mt-3 flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setVehicleIndex((i) => (i + 1) % VEHICLES.length)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <span className="font-display text-lg font-bold leading-none tracking-wider">
                {vehicle.plate}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
            </button>
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold leading-none ${voltageTone}`}
            >
              <BatteryMedium className="h-3.5 w-3.5" />
              {voltage.toFixed(1)}V
            </span>
          </div>

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-foreground/70">
            Fonte: {link.source}
            {link.message ? ` · ${link.message}` : ""}
          </p>
        </header>


        {(lowBattery || crash) && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">
            <BatteryMedium className="h-4 w-4" />
            {crash
              ? "Impacto/inclinação crítica detectada — verificar piloto"
              : `Tensão crítica da bateria: ${voltage.toFixed(1)}V`}
          </div>
         )}

         {linkMode === "wifi" && !localSession && !needsLocalLogin && (
           <button
             type="button"
             onClick={() => reopenLocalLogin()}
             className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
           >
             <WifiOff className="h-4 w-4" />
             Modo Simulação / Desconectado — Toque para conectar
           </button>
         )}

         <main className="flex-1 px-4 pt-4 pb-28">{children}</main>

        {needsLocalLogin && (
          <div
            className="fixed inset-0 z-40 grid place-items-center bg-navy/70 px-6"
            onClick={() => dismissLocalLogin()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loginLocal(password);
              }}
              onClick={(e) => e.stopPropagation()}
              className="card-ituran relative w-full max-w-sm p-5 text-center"
            >
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => dismissLocalLogin()}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15">
                <KeyRound className="h-6 w-6 text-navy" />
              </span>
              <h2 className="mt-3 font-display text-lg font-bold">Conectar à câmera</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Conecte seu celular à rede Wi-Fi AP da câmera e informe a senha local do
                dispositivo. Toda a comunicação é feita direto no gateway AP.
              </p>
              <ol className="mt-4 space-y-2 rounded-xl bg-muted/60 p-3 text-left text-[11px] leading-snug text-muted-foreground">
                {[
                  "Conecte seu celular à rede Wi-Fi AP da câmera (ex.: Howen_ME41) nos Ajustes do telefone.",
                  'Se o celular avisar "sem acesso à internet", toque em "Manter conectado".',
                  "Digite a senha da câmera abaixo (padrão: 111111) e toque em Entrar.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-left text-[10px] text-muted-foreground/80">
                Apenas na primeira conexão. O celular reconecta automaticamente nas próximas
                viagens.
              </p>

              <div
                className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold ${
                  cameraReachable
                    ? "bg-primary/15 text-navy"
                    : cameraReachable === false
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {cameraReachable ? (
                  <Wifi className="h-3.5 w-3.5 text-primary" />
                ) : cameraReachable === false ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {cameraReachable
                  ? "Câmera detectada na rede local"
                  : cameraReachable === false
                    ? "Sem resposta do ping (normal com 4G ativo) — você já pode entrar"
                    : "Procurando câmera na rede local..."}
              </div>

              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha da câmera"
                className="hud-number mt-3 w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-center text-base tracking-[0.3em] outline-none focus:border-primary"
              />
              {localError && (
                <p className="mt-2 text-[11px] font-semibold text-destructive">{localError}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={localBusy}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all disabled:opacity-60 ${
                    password.length > 0
                      ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary))] ring-2 ring-primary/40"
                      : "bg-primary/70 text-primary-foreground"
                  }`}
                >

                  {localBusy ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "Entrar"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissLocalLogin();
                    setLinkMode("cloud");
                  }}
                  className="flex-1 rounded-xl bg-muted px-3 py-2.5 text-sm font-bold text-muted-foreground"
                >
                  Usar 4G
                </button>
              </div>
            </form>
          </div>
        )}



        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="card-ituran px-2 py-1.5 shadow-[var(--shadow-raise)]">
          <ul className="flex items-stretch justify-between">
            {TABS.map((tab) => {
              const active = pathname === tab.to;
              const Icon = tab.icon;
              return (
                <li key={tab.to} className="flex-1">
                  <Link
                    to={tab.to}
                    className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                    <span
                      className={`h-0.5 w-6 rounded-full ${active ? "bg-primary" : "bg-transparent"}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          </div>
        </nav>
      </div>
    </FleetContext.Provider>
  );
}
