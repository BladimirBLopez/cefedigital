import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar } from "@/lib/limite";

export const dynamic = "force-dynamic";

const huella = (s) => createHash("sha256").update(String(s)).digest();

function claveOk(recibida) {
  const esperada = process.env.PAGO_WEBHOOK_SECRET || "";
  if (!esperada || !recibida) return false;
  return timingSafeEqual(huella(recibida), huella(esperada));
}

const respuesta = (cuerpo, estado = 200) =>
  NextResponse.json(cuerpo, { status: estado, headers: { "cache-control": "no-store" } });

export async function GET(request) {
  if (!process.env.PAGO_WEBHOOK_SECRET) return respuesta({ ok: false, error: "no_configurado" }, 503);

  const ip = await ipCliente();
  if ((await contar("pago_pend_fallo", ip, 15)) >= 10) return respuesta({ ok: false, error: "limite" }, 429);

  const clave = request.headers.get("x-pago-secret") || "";
  if (!claveOk(clave)) {
    await anotar("pago_pend_fallo", ip);
    return respuesta({ ok: false, error: "no_autorizado" }, 401);
  }

  try {
    const [r] = await sql`
      select
        (select count(*)::int from pedidos where estado = 'pendiente' and creado_en > now() - interval '15 minutes') as recientes,
        (select count(*)::int from pagos_recibidos where estado = 'esperando') as esperando`;
    return respuesta({ ok: true, recientes: r.recientes, esperando: r.esperando });
  } catch {
    return respuesta({ ok: false, error: "interno" }, 500);
  }
}
