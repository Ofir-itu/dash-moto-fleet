import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * VSS Cloud authentication proxy.
 * Credentials never reach the browser: the admin account/password live in
 * server-side secrets (VSS_ACCOUNT / VSS_PASSWORD) and only the short-lived
 * session token + pid are returned to the client.
 */
const VSS_LOGIN_URL = "https://www.ituran.video/vss/user/apiLogin.action";

export type VssSession = {
  token: string;
  pid: string;
  /** epoch ms — VSS sessions expire after ~30 minutes */
  expiresAt: number;
};

export const vssAuth = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ account: z.string().min(1).optional(), password: z.string().min(1).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ ok: true; session: VssSession } | { ok: false; error: string }> => {
    const account = data.account ?? process.env["VSS_ACCOUNT"];
    const password = data.password ?? process.env["VSS_PASSWORD"];

    if (!account || !password) {
      return { ok: false, error: "VSS credentials not configured on the server." };
    }

    try {
      const res = await fetch(VSS_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ account, password }).toString(),
      });

      if (!res.ok) {
        return { ok: false, error: `Gateway VSS respondeu ${res.status}` };
      }

      const raw = (await res.json()) as Record<string, unknown>;
      const body = (raw["data"] as Record<string, unknown> | undefined) ?? raw;
      const token = String(body["token"] ?? "");
      const pid = String(body["pid"] ?? body["PID"] ?? "");

      if (!token || !pid) {
        return { ok: false, error: "Resposta do VSS sem token/pid." };
      }

      // 30-minute server session; refresh a couple of minutes early.
      return { ok: true, session: { token, pid, expiresAt: Date.now() + 30 * 60 * 1000 } };
    } catch (err) {
      console.error("vss-auth failed", err);
      return { ok: false, error: "Não foi possível contatar o gateway VSS." };
    }
  });
