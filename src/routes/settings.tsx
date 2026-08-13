import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, KeyRound, Lock, Router, Wifi } from "lucide-react";
import { useFleet } from "@/components/fleet-shell";
import { DEFAULT_AP_HOST, setApHost, useApHost } from "@/lib/ap-gateway";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ajustes e Segurança — Ituran Moto" },
      {
        name: "description",
        content:
          "Configuração do gateway Wi-Fi AP da câmera, modo de conexão local e armazenamento seguro de credenciais.",
      },
      { property: "og:title", content: "Ajustes e Segurança — Ituran Moto" },
      { property: "og:description", content: "Gateway AP da câmera, conexão e segurança da Ituran Moto." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="hud-number truncate text-right">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const { linkMode, setLinkMode } = useFleet();
  const [autoUpload, setAutoUpload] = useState(true);
  const apHost = useApHost();
  const [draft, setDraft] = useState(apHost);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <section className="card-ituran p-4">
        <h1 className="font-display text-xl font-bold">Ajustes</h1>
        <p className="text-xs text-muted-foreground">Conexão, endpoints e segurança</p>
      </section>

      <section className="card-ituran p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Wifi className="h-4 w-4 text-navy" /> Modo de conexão
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["wifi", "cloud"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setLinkMode(m)}
              className={`rounded-xl px-3 py-3 text-sm font-bold ${
                linkMode === m
                  ? m === "wifi"
                    ? "bg-primary text-primary-foreground"
                    : "bg-cloud text-cloud-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m === "wifi" ? "Wi-Fi AP (local)" : "Simulação"}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center justify-between text-sm font-semibold">
          Upload automático de eventos
          <button
            type="button"
            onClick={() => setAutoUpload((v) => !v)}
            className={`h-6 w-11 rounded-full p-0.5 transition-colors ${autoUpload ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${autoUpload ? "translate-x-5" : ""}`}
            />
          </button>
        </label>
      </section>

      <section className="card-ituran p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Router className="h-4 w-4 text-navy" /> IP da Câmera (Modo AP)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Endereço do gateway Wi-Fi AP da câmera. Streams, timeline e diagnósticos são requisitados
          direto neste endereço, sem servidores externos.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="url"
            placeholder={DEFAULT_AP_HOST}
            aria-label="IP da câmera em modo AP"
            className="hud-number min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              setApHost(draft);
              setSaved(true);
              setTimeout(() => setSaved(false), 1600);
            }}
            className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground active:scale-[0.99]"
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar"}
          </button>
        </div>
        <div className="mt-2 divide-y divide-border">
          <Row label="Gateway ativo" value={`http://${apHost}`} />
          <Row label="Servidor de mídia" value={`${apHost}:5677`} />
          <Row label="Padrão" value={DEFAULT_AP_HOST} />
        </div>
        <button
          type="button"
          onClick={() => {
            setApHost(DEFAULT_AP_HOST);
            setDraft(DEFAULT_AP_HOST);
          }}
          className="mt-3 w-full rounded-xl bg-muted px-4 py-2.5 text-xs font-bold text-muted-foreground"
        >
          Restaurar padrão
        </button>
      </section>

      <section className="card-ituran p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Lock className="h-4 w-4 text-navy" /> Segurança
        </h2>
        <div className="mt-2 divide-y divide-border">
          <Row label="Token de acesso" value="•••• •••• não provisionado" />
          <Row label="Renovação" value="Sessão local da câmera" />
          <Row label="Comunicação" value="Somente rede local (AP)" />
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-navy-foreground"
        >
          <KeyRound className="h-4 w-4 text-primary" /> Provisionar credenciais seguras
        </button>
      </section>
    </div>
  );
}
