import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar as anotarIntento } from "@/lib/limite";
import { anotar as registrar } from "@/lib/registro";
import { emparejar } from "@/lib/emparejar-pago";
import { procesarComprasStreamZone } from "@/lib/comprar-streamzone";

export const dynamic = "force-dynamic";

const huella = (s) => createHash("sha256").update(String(s)).digest();

function claveOk(recibida) {
  const esperada = process.env.PAGO_WEBHOOK_SECRET || "";
  if (!esperada || !recibida) return false;
  return timingSafeEqual(huella(recibida), huella(esperada));
}

const respuesta = (cuerpo, estado = 200) =>
  NextResponse.json(cuerpo, { status: estado, headers: { "x-pago-v": "2" } });

export async function POST(request) {
  if (!process.env.PAGO_WEBHOOK_SECRET) return respuesta({ ok: false, error: "no_configurado" }, 503);

  const ip = await ipCliente();
  if ((await contar("pago_auto_fallo", ip, 15)) >= 10) return respuesta({ ok: false, error: "limite" }, 429);

  const auth = request.headers.get("authorization") || "";
  const clave = request.headers.get("x-pago-secret") || auth.replace(/^Bearer\s+/i, "");
  if (!claveOk(clave)) {
    await anotarIntento("pago_auto_fallo", ip);
    return respuesta({ ok: false, error: "no_autorizado" }, 401);
  }

  let datos;
  try {
    datos = await request.json();
  } catch {
    return respuesta({ ok: false, error: "json" }, 400);
  }

  const ref = String(datos?.ref || "").trim().slice(0, 200);
  const monto = Math.round(Number(datos?.monto) * 100) / 100;
  const texto = String(datos?.texto || "").slice(0, 2000).toUpperCase();
  const pagador = String(datos?.pagador || "").trim().slice(0, 120);
  const recibidoMs = Date.parse(String(datos?.recibido || ""));
  const recibido = new Date(Number.isFinite(recibidoMs) ? recibidoMs : Date.now()).toISOString();
  if (!ref || !Number.isFinite(monto) || monto <= 0 || monto > 100000) {
    return respuesta({ ok: false, error: "datos" }, 400);
  }

  let nuevoId = null;
  try {
    const [nuevo] = await sql`
      insert into pagos_recibidos (ref, monto, estado, pagador, recibido_en)
      values (${ref}, ${monto}, 'recibido', ${pagador || null}, ${recibido}::timestamptz)
      on conflict (ref) do nothing
      returning id`;
    let fila = nuevo;
    if (!fila) {
      const [ex] = await sql`select id, estado from pagos_recibidos where ref = ${ref}`;
      if (!ex || ex.estado !== "esperando") {
        return respuesta({ ok: true, duplicado: true, estado: ex ? ex.estado : null });
      }
      fila = ex;
    }
    nuevoId = nuevo ? nuevo.id : null;

    const codigos = [...new Set(texto.match(/\b[0-9A-F]{12}\b/g) || [])].slice(0, 5);
    let pedido = null;
    let motivo = codigos.length ? "codigo_no_encontrado" : "sin_codigo";

    for (const codigo of codigos) {
      const [p] = await sql`
        select id, codigo, total::float as total, estado from pedidos where codigo = ${codigo}`;
      if (!p) continue;
      if (p.estado !== "pendiente") {
        motivo = "pedido_no_pendiente";
        continue;
      }
      if (Math.abs(p.total - monto) > 0.01) {
        motivo = "monto_distinto";
        continue;
      }
      pedido = p;
      break;
    }

    let esperando = false;
    if (!pedido && !codigos.length && process.env.PAGO_ASIGNAR_POR_MONTO === "1") {
      const r = await emparejar({ monto, pagador, recibido });
      if (r.pedido) {
        pedido = r.pedido;
      } else {
        motivo = r.motivo;
        esperando = Boolean(r.esperando) && Date.now() - Date.parse(recibido) < 2 * 60 * 60 * 1000;
        if (r.esperando && !esperando) motivo = "sin_aviso";
      }
    }

    if (!pedido && esperando) {
      await sql`update pagos_recibidos set estado = 'esperando', motivo = ${motivo} where id = ${fila.id}`;
      return respuesta({ ok: true, estado: "esperando", motivo });
    }

    if (pedido) {
      const [r] = await sql`
        update pedidos
        set estado = 'pagado', pagado_en = coalesce(pagado_en, now()), metodo_pago = 'qr_auto'
        where id = ${pedido.id} and estado = 'pendiente'
        returning id, codigo`;
      if (r) {
        await sql`update pagos_recibidos set estado = 'asignado', pedido_id = ${r.id} where id = ${fila.id}`;
        await registrar("pago_auto", "pedido", r.id, `Pago de Bs ${monto.toFixed(2)} confirmado automáticamente (${r.codigo})`);
        try {
          await procesarComprasStreamZone(r.id);
        } catch (error) {
          console.error("Procesamiento StreamZone tras pago automático:", error);
        }
        revalidatePath("/admin/pedidos");
        revalidatePath("/admin");
        revalidatePath(`/pedido/${r.codigo}`);
        return respuesta({ ok: true, estado: "asignado", pedido: r.codigo });
      }
      motivo = "pedido_no_pendiente";
    }

    await sql`update pagos_recibidos set estado = 'sin_asignar', motivo = ${motivo} where id = ${fila.id}`;
    await registrar("pago_sin_asignar", "pago", null, `Pago de Bs ${monto.toFixed(2)} sin asignar (${motivo})`);
    return respuesta({ ok: true, estado: "sin_asignar", motivo });
  } catch (e) {
    console.error("pago automatico fallo", e);
    if (nuevoId) {
      try {
        await sql`delete from pagos_recibidos where id = ${nuevoId} and estado = 'recibido'`;
      } catch {}
    }
    return respuesta({ ok: false, error: "interno" }, 500);
  }
}
