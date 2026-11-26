import { timingSafeEqual } from "node:crypto";
import { sincronizarCatalogoStreamZone } from "@/lib/sincronizar-streamzone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function autorizado(request) {
  const esperado = process.env.STREAMZONE_WEBHOOK_SECRET || "";
  const recibido = new URL(request.url).searchParams.get("token") || "";

  if (!esperado || !recibido) return false;

  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!process.env.STREAMZONE_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "no_configurado" }, { status: 503 });
  }

  if (!autorizado(request)) {
    return Response.json({ ok: false, error: "no_autorizado" }, { status: 401 });
  }

  return Response.json({
    ok: true,
    endpoint: "streamzone-webhook",
    events: ["price.updated", "stock.status"]
  });
}

export async function POST(request) {
  if (!process.env.STREAMZONE_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "no_configurado" }, { status: 503 });
  }

  if (!autorizado(request)) {
    return Response.json({ ok: false, error: "no_autorizado" }, { status: 401 });
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ ok: false, error: "datos_invalidos" }, { status: 400 });
  }

  const evento = String(payload.event || "").trim().toLowerCase();

  if (!evento || ["ping", "test", "webhook.test"].includes(evento)) {
    return Response.json({ ok: true, ping: true });
  }

  if (!["price.updated", "stock.status"].includes(evento)) {
    return Response.json({ ok: true, ignored: true, event: evento });
  }

  try {
    const resultado = await sincronizarCatalogoStreamZone();

    return Response.json({
      ok: true,
      event: evento,
      ...resultado
    });
  } catch (error) {
    console.error("Webhook StreamZone:", error);

    return Response.json(
      { ok: false, error: "No se pudo actualizar el catálogo." },
      { status: 500 }
    );
  }
}
