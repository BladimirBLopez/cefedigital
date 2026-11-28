import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { procesarAvisoCentralOne } from "@/lib/comprar-central-one";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const EVENTOS = new Set([
  "order.delivered",
  "order.partially_delivered",
  "order.failed",
  "order.refunded",
  "order.cancelled"
]);

// CONFIRMAR con la documentación de Central One.
const H_FIRMA = [
  "x-centralone-signature",
  "x-central-one-signature",
  "x-co-signature",
  "x-webhook-signature",
  "x-signature"
];
const H_HORA = [
  "x-centralone-timestamp",
  "x-central-one-timestamp",
  "x-co-timestamp",
  "x-webhook-timestamp",
  "x-timestamp"
];

function leer(request, nombres) {
  for (const n of nombres) {
    const v = request.headers.get(n);
    if (v) return v.trim();
  }
  return "";
}

function firmaValida(secreto, hora, cuerpo, recibida) {
  const esperado = createHmac("sha256", secreto)
    .update(`${hora}.${cuerpo}`)
    .digest("hex");

  const limpio = recibida.replace(/^sha256=/i, "").trim().toLowerCase();
  const a = Buffer.from(limpio);
  const b = Buffer.from(esperado);

  return a.length === b.length && timingSafeEqual(a, b);
}

function horaReciente(hora) {
  let ms = NaN;

  if (/^\d+$/.test(hora)) {
    const n = Number(hora);
    ms = n < 1e12 ? n * 1000 : n;
  } else {
    ms = Date.parse(hora);
  }

  return Number.isFinite(ms) && Math.abs(Date.now() - ms) <= 5 * 60 * 1000;
}

function extraerIdOrden(p) {
  const candidatos = [
    p?.data?.order?.id,
    p?.order?.id,
    p?.data?.order_id,
    p?.order_id,
    p?.data?.id
  ];

  for (const c of candidatos) {
    const v = String(c ?? "").trim();
    if (v && v.length <= 64 && /^[\w-]+$/.test(v)) return v;
  }

  return null;
}

export async function GET() {
  if (!process.env.CENTRAL_ONE_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "no_configurado" }, { status: 503 });
  }

  return Response.json({ ok: true, endpoint: "central-one-webhook" });
}

export async function POST(request) {
  const secreto = process.env.CENTRAL_ONE_WEBHOOK_SECRET || "";

  if (!secreto) {
    return Response.json({ ok: false, error: "no_configurado" }, { status: 503 });
  }

  const cuerpo = await request.text();
  const hora = leer(request, H_HORA);
  const firma = leer(request, H_FIRMA);

  if (!hora || !firma || !horaReciente(hora) || !firmaValida(secreto, hora, cuerpo, firma)) {
    console.warn(
      "Webhook Central One rechazado. Headers recibidos:",
      [...request.headers.keys()].join(",")
    );
    return Response.json({ ok: false, error: "no_autorizado" }, { status: 401 });
  }

  let payload;

  try {
    payload = JSON.parse(cuerpo);
  } catch {
    return Response.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ ok: false, error: "datos_invalidos" }, { status: 400 });
  }

  const evento = String(payload.event || payload.type || "").trim().toLowerCase();

  if (!evento || ["ping", "test", "webhook.test"].includes(evento)) {
    return Response.json({ ok: true, ping: true });
  }

  if (!EVENTOS.has(evento)) {
    return Response.json({ ok: true, ignored: true, event: evento });
  }

  const idOrden = extraerIdOrden(payload);

  after(async () => {
    try {
      await procesarAvisoCentralOne(idOrden);
    } catch (e) {
      console.error("Webhook Central One:", e?.message || "");
    }
  });

  return Response.json({ ok: true, event: evento });
}
