import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";

import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { consultarCentralOne } from "@/lib/central-one";

const PROVEEDOR = "central_one";
const SIN_REINTENTO = new Set(["not_eligible", "cancelled", "unknown"]);

function fallo(code, mensaje) {
  const e = new Error(mensaje);
  e.code = code;
  e.local = true;
  return e;
}

function obtenerClave() {
  const valor =
    process.env.CENTRAL_ONE_CODES_SECRET ||
    process.env.STREAMZONE_CREDENTIALS_SECRET ||
    "";

  if (!/^[a-f0-9]{64}$/i.test(valor)) {
    throw fallo(
      "sin_clave_cifrado",
      "Falta la clave para cifrar los códigos (64 caracteres hexadecimales)."
    );
  }

  return Buffer.from(valor, "hex");
}

function cifrar(lista) {
  const clave = obtenerClave();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", clave, iv);

  const contenido = Buffer.concat([
    cipher.update(JSON.stringify(lista), "utf8"),
    cipher.final()
  ]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    contenido.toString("base64")
  ].join(".");
}

function descifrar(texto) {
  const partes = String(texto).split(".");

  if (partes.length !== 3) {
    throw new Error("Formato de códigos cifrados inválido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    obtenerClave(),
    Buffer.from(partes[0], "base64")
  );

  decipher.setAuthTag(Buffer.from(partes[1], "base64"));

  const contenido = Buffer.concat([
    decipher.update(Buffer.from(partes[2], "base64")),
    decipher.final()
  ]);

  return JSON.parse(contenido.toString("utf8"));
}

function validarTarget(item) {
  const campos = Array.isArray(item.central_one_target_fields)
    ? item.central_one_target_fields.map(String)
    : [];

  if (campos.length === 0) return null;

  const esquema = Array.isArray(item.central_one_target_schema)
    ? item.central_one_target_schema
    : [];

  const origen = item.target_payload;

  if (!origen || typeof origen !== "object" || Array.isArray(origen)) {
    throw fallo("target_invalido", "Faltan los datos del cliente para este producto.");
  }

  const salida = {};

  for (const clave of campos) {
    const valor = String(origen[clave] ?? "").trim();

    if (!valor || valor.length > 64) {
      throw fallo("target_invalido", `Dato inválido o faltante: ${clave}.`);
    }

    const def = esquema.find((c) => c && c.key === clave);

    if (def?.type === "select") {
      const permitido =
        Array.isArray(def.options) &&
        def.options.some((o) => String(o.value) === valor);

      if (!permitido) {
        throw fallo("target_invalido", `Opción no permitida en: ${clave}.`);
      }
    }

    salida[clave] = valor;
  }

  if (JSON.stringify(salida).length > 2048) {
    throw fallo("target_invalido", "Los datos del cliente son demasiado largos.");
  }

  return salida;
}

async function actualizarOrden(reg) {
  if (Number(reg.edad_seg) < 30) return "procesando";

  const idOrden = encodeURIComponent(reg.central_one_order_id);
  const datos = await consultarCentralOne(`/orders/${idOrden}`);
  const orden = datos?.order || {};
  const linea = Array.isArray(orden.items) ? orden.items[0] : null;
  const estadoLinea = String(linea?.status || "");
  const estadoOrden = String(orden.status || "");
  const entregados = Number(linea?.delivered_count) || 0;

  const resumen = JSON.stringify({
    reference_code: orden.reference_code || null,
    status: estadoOrden,
    line: linea
      ? {
          status: estadoLinea,
          delivered_count: entregados,
          failure: linea.failure || null,
          refund: linea.refund || null
        }
      : null
  });

  const unitario = linea?.unit_sale_price ?? null;
  const total = orden.total_sale_amount ?? null;
  const completa =
    estadoLinea === "completed" || (!linea && estadoOrden === "completed");

  if (completa) {
    let cifrados = null;

    if (entregados > 0) {
      try {
        const cod = await consultarCentralOne(`/orders/${idOrden}/codes`);

        const lista = (Array.isArray(cod?.order?.items) ? cod.order.items : [])
          .flatMap((i) => (Array.isArray(i.codes) ? i.codes.map(String) : []));

        if (lista.length === 0) {
          throw fallo("sin_codigos", "Central One no devolvió códigos.");
        }

        cifrados = cifrar(lista);
      } catch (e) {
        await sql`
          update central_one_compras
          set estado_proveedor = ${estadoLinea || estadoOrden || null},
              lineas = ${resumen}::jsonb,
              error_code = ${String(e?.code || "codigos").slice(0, 40)},
              error_mensaje = ${String(e?.message || "No se pudieron leer los códigos.").slice(0, 240)},
              actualizado_en = now()
          where id = ${reg.id}
        `;
        return "procesando";
      }
    }

    await sql`
      update central_one_compras
      set estado = 'completado',
          estado_proveedor = ${estadoLinea || estadoOrden},
          lineas = ${resumen}::jsonb,
          codigos_cifrados = ${cifrados},
          costo_unitario_usd = ${unitario},
          costo_total_usd = ${total},
          error_code = null,
          error_mensaje = null,
          procesando_en = null,
          actualizado_en = now()
      where id = ${reg.id}
    `;
    return "completado";
  }

  if (estadoLinea === "refunded") {
    await sql`
      update central_one_compras
      set estado = 'reembolsado',
          estado_proveedor = 'refunded',
          lineas = ${resumen}::jsonb,
          actualizado_en = now()
      where id = ${reg.id}
    `;
    return "reembolsado";
  }

  const cerrada =
    ["failed", "cancelled"].includes(estadoLinea) ||
    (!linea && ["failed", "cancelled"].includes(estadoOrden));

  if (cerrada) {
    const codigo = String(
      linea?.failure?.code || (estadoLinea === "cancelled" ? "cancelled" : "unknown")
    ).slice(0, 40);

    const mensaje = String(
      linea?.failure?.message_es || linea?.failure?.message || "Central One no entregó el pedido."
    ).slice(0, 240);

    await sql`
      update central_one_compras
      set estado = 'fallido',
          estado_proveedor = ${estadoLinea || estadoOrden},
          lineas = ${resumen}::jsonb,
          error_code = ${codigo},
          error_mensaje = ${mensaje},
          procesando_en = null,
          actualizado_en = now()
      where id = ${reg.id}
    `;
    return "fallido";
  }

  await sql`
    update central_one_compras
    set estado_proveedor = ${estadoLinea || estadoOrden || null},
        lineas = ${resumen}::jsonb,
        actualizado_en = now()
    where id = ${reg.id}
  `;
  return "procesando";
}

export async function procesarComprasCentralOne(pedidoId, opciones = {}) {
  const reintentar = opciones.reintentar === true;
  const id = Number(pedidoId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identificador de pedido inválido.");
  }

  await asegurarEsquema();

  const items = await sql`
    select
      pi.id,
      pi.cantidad,
      pi.target_payload,
      pr.proveedor_producto_id,
      pr.costo_proveedor_usd::text as costo_usd,
      pr.central_one_target_fields,
      pr.central_one_target_schema
    from pedido_items pi
    join productos pr on pr.id = pi.producto_id
    join pedidos p on p.id = pi.pedido_id
    where pi.pedido_id = ${id}
      and pr.proveedor = ${PROVEEDOR}
      and p.estado in ('pagado', 'entregado')
    order by pi.id
  `;

  const resultado = { total: items.length, completadas: 0, procesando: 0, errores: 0 };

  for (const item of items) {
    const itemId = Number(item.id);
    const cantidad = Number(item.cantidad);
    const llaveBase = `cefedigital-co-${id}-${itemId}`;

    await sql`
      insert into central_one_compras (
        pedido_item_id, pedido_id, proveedor_producto_id, cantidad, idempotency_key
      )
      values (
        ${itemId}, ${id}, ${item.proveedor_producto_id || null}, ${cantidad}, ${llaveBase}
      )
      on conflict (pedido_item_id) do nothing
    `;

    const [reg] = await sql`
      select id, estado, central_one_order_id, error_code,
             extract(epoch from (now() - actualizado_en))::float as edad_seg
      from central_one_compras
      where pedido_item_id = ${itemId}
    `;

    if (!reg) continue;

    if (reg.estado === "completado") {
      resultado.completadas++;
      continue;
    }

    if (reg.estado === "reembolsado") {
      resultado.errores++;
      continue;
    }

    if (reg.estado === "procesando") {
      try {
        const nuevo = await actualizarOrden(reg);
        if (nuevo === "completado") resultado.completadas++;
        else if (nuevo === "procesando") resultado.procesando++;
        else resultado.errores++;
      } catch (e) {
        console.error("Central One consulta de pedido:", e?.message || "");
        resultado.procesando++;
      }
      continue;
    }

    if (reg.estado === "fallido") {
      if (!reintentar || SIN_REINTENTO.has(String(reg.error_code))) {
        resultado.errores++;
        continue;
      }

      const llaveNueva = `${llaveBase}-r${Date.now().toString(36)}`;

      const [reiniciado] = await sql`
        update central_one_compras
        set estado = 'pendiente',
            idempotency_key = ${llaveNueva},
            central_one_order_id = null,
            estado_proveedor = null,
            lineas = null,
            actualizado_en = now()
        where id = ${reg.id} and estado = 'fallido'
        returning id
      `;

      if (!reiniciado) continue;
    }

    const [tomado] = await sql`
      update central_one_compras
      set estado = 'enviando',
          intentos = intentos + 1,
          procesando_en = now(),
          actualizado_en = now(),
          error_code = null,
          error_mensaje = null
      where id = ${reg.id}
        and central_one_order_id is null
        and (
          estado in ('pendiente', 'incierto', 'error')
          or (
            estado = 'enviando'
            and (procesando_en is null or procesando_en < now() - interval '10 minutes')
          )
        )
      returning id, idempotency_key
    `;

    if (!tomado) continue;

    try {
      const target = validarTarget(item);

      if (!item.proveedor_producto_id) {
        throw fallo("sin_producto", "El producto no tiene ID de Central One.");
      }

      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) {
        throw fallo("cantidad_invalida", "Cantidad inválida para Central One.");
      }

      const precio = Number(item.costo_usd);

      if (!Number.isFinite(precio) || precio <= 0) {
        throw fallo("sin_precio", "El producto no tiene precio de Central One.");
      }

      const linea = {
        catalog_item_id: item.proveedor_producto_id,
        quantity: cantidad,
        expected_unit_price: Number(precio.toFixed(4))
      };

      if (target) linea.target_payload = target;

      const datos = await consultarCentralOne("/orders", {
        method: "POST",
        idempotencyKey: tomado.idempotency_key,
        body: { items: [linea], note: `cefe-${id}-${itemId}` }
      });

      const orden = datos?.order;

      if (!orden?.id) {
        throw fallo("respuesta_invalida", "Central One no devolvió el id del pedido.");
      }

      const resumen = JSON.stringify({
        reference_code: orden.reference_code || null,
        status: orden.status || null,
        line: null
      });

      await sql`
        update central_one_compras
        set estado = 'procesando',
            central_one_order_id = ${String(orden.id)},
            estado_proveedor = ${orden.status || null},
            lineas = ${resumen}::jsonb,
            costo_total_usd = ${orden.total_sale_amount ?? null},
            procesando_en = null,
            actualizado_en = now()
        where id = ${tomado.id}
      `;

      resultado.procesando++;
    } catch (error) {
      const codigo = String(error?.code || "error").slice(0, 40);
      const mensaje = String(error?.message || "Error desconocido en Central One.").slice(0, 240);
      const status = Number(error?.status) || 0;
      const incierto = !error?.local && (status === 0 || status >= 500);

      await sql`
        update central_one_compras
        set estado = ${incierto ? "incierto" : "error"},
            error_code = ${codigo},
            error_mensaje = ${mensaje},
            procesando_en = null,
            actualizado_en = now()
        where id = ${tomado.id}
      `;

      resultado.errores++;
    }
  }

  try {
    await cerrarPedidoSiEntregadoCentralOne(id);
  } catch (e) {
    console.error("Cerrar pedido Central One:", e?.message || "");
  }

  return resultado;
}

export async function cerrarPedidoSiEntregadoCentralOne(pedidoId) {
  const id = Number(pedidoId);

  if (!Number.isInteger(id) || id <= 0) return null;

  const [r] = await sql`
    update pedidos p
    set estado = 'entregado',
        entregado_en = now()
    where p.id = ${id}
      and p.estado = 'pagado'
      and not exists (
        select 1
        from pedido_items pi
        join productos pr on pr.id = pi.producto_id
        left join central_one_compras cc on cc.pedido_item_id = pi.id
        where pi.pedido_id = p.id
          and (
            pr.proveedor is distinct from 'central_one'
            or cc.estado is distinct from 'completado'
          )
      )
    returning p.id, p.codigo
  `;

  return r || null;
}

export async function obtenerComprasCentralOne(pedidoId) {
  await asegurarEsquema();

  const filas = await sql`
    select cc.pedido_item_id, cc.estado, cc.codigos_cifrados,
           pr.nombre as producto
    from central_one_compras cc
    join pedido_items pi on pi.id = cc.pedido_item_id
    join productos pr on pr.id = pi.producto_id
    where cc.pedido_id = ${Number(pedidoId)}
    order by cc.id
  `;

  return filas.map((fila) => {
    let codigos = [];
    let errorLectura = false;

    if (fila.codigos_cifrados) {
      try {
        codigos = descifrar(fila.codigos_cifrados);
      } catch {
        errorLectura = true;
      }
    }

    return {
      pedido_item_id: fila.pedido_item_id,
      producto: fila.producto,
      estado: fila.estado,
      codigos,
      errorLectura
    };
  });
}

export async function sincronizarEstadoCentralOne(pedidoId) {
  const id = Number(pedidoId);

  if (!Number.isInteger(id) || id <= 0) return { revisadas: 0 };

  await asegurarEsquema();

  const filas = await sql`
    select id, estado, central_one_order_id,
           extract(epoch from (now() - actualizado_en))::float as edad_seg
    from central_one_compras
    where pedido_id = ${id}
      and estado = 'procesando'
      and central_one_order_id is not null
  `;

  let revisadas = 0;

  for (const reg of filas) {
    try {
      await actualizarOrden(reg);
      revisadas++;
    } catch (e) {
      console.error("Central One consulta de estado:", e?.message || "");
    }
  }

  try {
    await cerrarPedidoSiEntregadoCentralOne(id);
  } catch (e) {
    console.error("Cerrar pedido Central One:", e?.message || "");
  }

  return { revisadas };
}

export async function procesarAvisoCentralOne(idOrden) {
  await asegurarEsquema();

  const id = idOrden ? String(idOrden) : null;

  if (id) await new Promise((r) => setTimeout(r, 3000));

  const filas = id
    ? await sql`
        select id, pedido_id, estado, central_one_order_id,
               999::float as edad_seg
        from central_one_compras
        where central_one_order_id = ${id}
          and estado = 'procesando'
      `
    : await sql`
        select id, pedido_id, estado, central_one_order_id,
               999::float as edad_seg
        from central_one_compras
        where estado = 'procesando'
          and central_one_order_id is not null
        order by actualizado_en
        limit 20
      `;

  const pedidos = new Set();

  for (const reg of filas) {
    try {
      await actualizarOrden(reg);
      pedidos.add(Number(reg.pedido_id));
    } catch (e) {
      console.error("Central One aviso:", e?.message || "");
    }
  }

  for (const pedidoId of pedidos) {
    try {
      await cerrarPedidoSiEntregadoCentralOne(pedidoId);
    } catch (e) {
      console.error("Cerrar pedido Central One:", e?.message || "");
    }
  }

  return { revisadas: filas.length };
}
