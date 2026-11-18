
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar } from "@/lib/limite";

function leerCliente(formData) {
  const nombre = String(formData.get("cliente_nombre") || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

  let whatsapp = String(formData.get("cliente_whatsapp") || "")
    .replace(/\D/g, "")
    .slice(0, 15);

  if (whatsapp.length === 8) whatsapp = "591" + whatsapp;

  if (nombre.length < 2 || whatsapp.length < 8 || whatsapp.length > 15) {
    return null;
  }

  return { nombre, whatsapp };
}

async function guardarPedido({ cliente, codigo, total, lineas }) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new Error("El pedido no tiene detalles");
  }

  const registros = lineas.map((l) => ({
    producto_id: Number(l.p.id),
    cantidad: Number(l.cant),
    precio_unit: Number(l.precioUnit),
    dato_cliente: l.dato || null,
    plan_id: l.plan ? Number(l.plan.id) : null,
    plan_nombre: l.plan ? l.plan.nombre : null,
    costo_unit: l.plan && l.plan.costo != null
      ? Number(l.plan.costo) : null,
    duracion_dias: l.duracionDias == null
      ? null : Number(l.duracionDias)
  }));

  const [r] = await sql`
    WITH nuevo_cliente AS (
      INSERT INTO clientes (nombre, whatsapp)
      VALUES (${cliente.nombre}, ${cliente.whatsapp})
      RETURNING id
    ),
    nuevo_pedido AS (
      INSERT INTO pedidos (codigo, cliente_id, total)
      SELECT ${codigo}, id, ${total}
      FROM nuevo_cliente
      RETURNING id, codigo
    ),
    nuevos_items AS (
      INSERT INTO pedido_items (
        pedido_id, producto_id, cantidad, precio_unit,
        dato_cliente, plan_id, plan_nombre, costo_unit,
        duracion_dias
      )
      SELECT
        np.id, i.producto_id, i.cantidad, i.precio_unit,
        i.dato_cliente, i.plan_id, i.plan_nombre,
        i.costo_unit, i.duracion_dias
      FROM nuevo_pedido np
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(registros)}::jsonb)
      AS i(
        producto_id integer,
        cantidad integer,
        precio_unit numeric,
        dato_cliente text,
        plan_id integer,
        plan_nombre text,
        costo_unit numeric,
        duracion_dias integer
      )
      RETURNING id
    )
    SELECT
      np.id,
      np.codigo,
      (SELECT count(*)::int FROM nuevos_items) AS items_creados
    FROM nuevo_pedido np
  `;

  if (!r || Number(r.items_creados) !== registros.length) {
    throw new Error("No se guardaron todos los detalles del pedido");
  }

  return r;
}

export async function crearPedido(formData) {
  const productoId = Number(formData.get("producto_id"));
  const cantidad = Number(formData.get("cantidad"));

  if (
    !Number.isInteger(productoId) ||
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 5
  ) redirect("/");

  const [p] = await sql`
    SELECT id, slug, tipo, campo_cliente,
           precio::float AS precio, duracion_dias
    FROM productos
    WHERE id = ${productoId} AND activo
  `;

  if (!p) redirect("/");

  const cliente = leerCliente(formData);
  if (!cliente) redirect(`/producto/${p.slug}?error=datos`);

  const dato = String(formData.get("dato_cliente") || "")
    .trim()
    .slice(0, 100);

  if (p.tipo === "recarga" && p.campo_cliente && !dato) {
    redirect(`/producto/${p.slug}?error=dato`);
  }

  const planes = await sql`
    SELECT id, nombre, precio::float AS precio,
           costo::float AS costo, duracion_dias
    FROM planes
    WHERE producto_id = ${p.id} AND activo
  `;

  const plan = planes.find(
    (x) => String(x.id) === String(formData.get("plan_id") || "")
  );

  if (planes.length > 0 && !plan) {
    redirect(`/producto/${p.slug}?error=plan`);
  }

  const cant = plan ? 1 : cantidad;
  const precioUnit = plan ? plan.precio : p.precio;
  const duracionDias = plan?.duracion_dias ?? p.duracion_dias ?? null;

  const ip = await ipCliente();

  if ((await contar("pedido_ip", ip, 60)) >= 8) {
    redirect(`/producto/${p.slug}?error=limite`);
  }

  await anotar("pedido_ip", ip);

  const total = Math.round(precioUnit * cant * 100) / 100;
  const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();

  try {
    await guardarPedido({
      cliente,
      codigo,
      total,
      lineas: [{
        p, plan, dato, cant, precioUnit, duracionDias
      }]
    });
  } catch (e) {
    console.error("crear pedido fallo", e);
    redirect(`/producto/${p.slug}?error=fallo`);
  }

  redirect(`/pedido/${codigo}?aviso=pedido_creado`);
}

export async function crearPedidoCarrito(formData) {
  const cliente = leerCliente(formData);
  if (!cliente) redirect("/carrito?error=datos");

  let items = [];

  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {}

  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    redirect("/carrito?error=vacio");
  }

  const lineas = [];

  for (const it of items) {
    const productoId = Number(it?.producto_id);
    const cantidad = Number(it?.cantidad);

    if (
      !Number.isInteger(productoId) ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > 5
    ) redirect("/carrito?error=invalido");

    const [p] = await sql`
      SELECT id, tipo, campo_cliente,
             precio::float AS precio, duracion_dias
      FROM productos
      WHERE id = ${productoId} AND activo
    `;

    if (!p) redirect("/carrito?error=invalido");

    const dato = String(it?.dato_cliente || "")
      .trim()
      .slice(0, 100);

    if (p.tipo === "recarga" && p.campo_cliente && !dato) {
      redirect("/carrito?error=dato");
    }

    const planes = await sql`
      SELECT id, nombre, precio::float AS precio,
             costo::float AS costo, duracion_dias
      FROM planes
      WHERE producto_id = ${p.id} AND activo
    `;

    const plan = planes.find(
      (x) => String(x.id) === String(it?.plan_id || "")
    );

    if (planes.length > 0 && !plan) {
      redirect("/carrito?error=invalido");
    }

    lineas.push({
      p,
      plan,
      dato,
      cant: plan ? 1 : cantidad,
      precioUnit: plan ? plan.precio : p.precio,
      duracionDias: plan?.duracion_dias ?? p.duracion_dias ?? null
    });
  }

  const ip = await ipCliente();

  if ((await contar("pedido_ip", ip, 60)) >= 8) {
    redirect("/carrito?error=limite");
  }

  await anotar("pedido_ip", ip);

  const total = Math.round(
    lineas.reduce((s, l) => s + l.precioUnit * l.cant, 0) * 100
  ) / 100;

  const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();

  try {
    await guardarPedido({ cliente, codigo, total, lineas });
  } catch (e) {
    console.error("crear pedido carrito fallo", e);
    redirect("/carrito?error=fallo");
  }

  redirect(`/pedido/${codigo}?nuevo=1&aviso=pedido_creado`);
}
