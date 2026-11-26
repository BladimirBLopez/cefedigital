import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";

import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { comprarProductoStreamZone } from "@/lib/streamzone";

function obtenerClaveCifrado() {
  const valor = process.env.STREAMZONE_CREDENTIALS_SECRET || "";

  if (!/^[a-f0-9]{64}$/i.test(valor)) {
    throw new Error(
      "STREAMZONE_CREDENTIALS_SECRET debe contener 64 caracteres hexadecimales."
    );
  }

  return Buffer.from(valor, "hex");
}

function cifrarCredenciales(credenciales, clave) {
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", clave, iv);

  const contenido = Buffer.concat([
    cipher.update(JSON.stringify(credenciales), "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    contenido.toString("base64")
  ].join(".");
}

function descifrarCredenciales(texto) {
  const partes = String(texto).split(".");

  if (partes.length !== 3) {
    throw new Error("Formato de credenciales cifradas inválido.");
  }

  const [ivTxt, tagTxt, contenidoTxt] = partes;
  const clave = obtenerClaveCifrado();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    clave,
    Buffer.from(ivTxt, "base64")
  );

  decipher.setAuthTag(Buffer.from(tagTxt, "base64"));

  const contenido = Buffer.concat([
    decipher.update(Buffer.from(contenidoTxt, "base64")),
    decipher.final()
  ]);

  return JSON.parse(contenido.toString("utf8"));
}

export async function procesarComprasStreamZone(pedidoId) {
  const id = Number(pedidoId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identificador de pedido inválido.");
  }

  await asegurarEsquema();

  const items = await sql`
    select
      pi.id,
      pi.cantidad,
      pr.nombre,
      pr.proveedor_producto_id
    from pedido_items pi
    join productos pr on pr.id = pi.producto_id
    join pedidos p on p.id = pi.pedido_id
    where pi.pedido_id = ${id}
      and pr.proveedor = 'streamzone'
      and p.estado in ('pagado', 'entregado')
    order by pi.id
  `;

  const resultado = {
    total: items.length,
    completadas: 0,
    errores: 0
  };

  for (const item of items) {
    const itemId = Number(item.id);
    const cantidad = Number(item.cantidad);

    const idempotencyKey = `cefedigital-${id}-${itemId}`;

    await sql`
      insert into streamzone_compras (
        pedido_item_id,
        pedido_id,
        proveedor_producto_id,
        cantidad,
        idempotency_key
      )
      values (
        ${itemId},
        ${id},
        ${item.proveedor_producto_id || null},
        ${cantidad},
        ${idempotencyKey}
      )
      on conflict (pedido_item_id) do nothing
    `;

    const [registro] = await sql`
      select id, estado
      from streamzone_compras
      where pedido_item_id = ${itemId}
    `;

    if (!registro || registro.estado === "completado") {
      if (registro?.estado === "completado") {
        resultado.completadas++;
      }
      continue;
    }

    const [tomado] = await sql`
      update streamzone_compras
      set estado = 'procesando',
          intentos = intentos + 1,
          procesando_en = now(),
          actualizado_en = now(),
          error_code = null,
          error_mensaje = null
      where id = ${registro.id}
        and (
          estado in ('pendiente', 'error')
          or (
            estado = 'procesando'
            and (
              procesando_en is null
              or procesando_en < now() - interval '10 minutes'
            )
          )
        )
      returning id
    `;

    if (!tomado) continue;

    try {
      const clave = obtenerClaveCifrado();

      if (!item.proveedor_producto_id) {
        throw new Error("El producto no tiene ID de StreamZone.");
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad < 1 ||
        cantidad > 10
      ) {
        throw new Error("Cantidad inválida para StreamZone.");
      }

      const datos = await comprarProductoStreamZone({
        productId: item.proveedor_producto_id,
        quantity: cantidad,
        idempotencyKey
      });

      if (
        !datos?.ok ||
        String(datos.status || "").toUpperCase() !== "COMPLETED" ||
        !Array.isArray(datos.credentials) ||
        datos.credentials.length === 0
      ) {
        throw new Error(
          "StreamZone no confirmó la entrega de las credenciales."
        );
      }

      const cifradas = cifrarCredenciales(datos.credentials, clave);

      const cobrado = Number(datos.financial?.chargedCOP);

      await sql`
        update streamzone_compras
        set estado = 'completado',
            streamzone_order_id = ${datos.orderId || null},
            credenciales_cifradas = ${cifradas},
            cobrado_cop = ${Number.isFinite(cobrado) ? cobrado : null},
            error_code = null,
            error_mensaje = null,
            procesando_en = null,
            actualizado_en = now()
        where id = ${registro.id}
      `;

      resultado.completadas++;
    } catch (error) {
      const codigo = String(error?.code || "error").slice(0, 30);
      const mensaje = String(
        error?.message || "Error desconocido en StreamZone."
      ).slice(0, 240);

      await sql`
        update streamzone_compras
        set estado = 'error',
            error_code = ${codigo},
            error_mensaje = ${mensaje},
            procesando_en = null,
            actualizado_en = now()
        where id = ${registro.id}
      `;

      resultado.errores++;
    }
  }

  return resultado;
}

export async function obtenerComprasStreamZone(pedidoId) {
  await asegurarEsquema();

  const filas = await sql`
    select
      sc.pedido_item_id,
      sc.estado,
      sc.credenciales_cifradas,
      pr.nombre as producto
    from streamzone_compras sc
    join pedido_items pi on pi.id = sc.pedido_item_id
    join productos pr on pr.id = pi.producto_id
    where sc.pedido_id = ${Number(pedidoId)}
    order by sc.id
  `;

  return filas.map((fila) => {
    let credenciales = [];
    let errorLectura = false;

    if (fila.credenciales_cifradas) {
      try {
        credenciales = descifrarCredenciales(
          fila.credenciales_cifradas
        );
      } catch {
        errorLectura = true;
      }
    }

    return {
      pedido_item_id: fila.pedido_item_id,
      producto: fila.producto,
      estado: fila.estado,
      credenciales,
      errorLectura
    };
  });
}
