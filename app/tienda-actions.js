
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { ipCliente, contar, anotar } from "@/lib/limite";

function leerCliente(formData) {
  let whatsapp = String(formData.get("cliente_whatsapp") || "")
    .replace(/\D/g, "")
    .slice(0, 15);

  if (whatsapp.length === 8) whatsapp = "591" + whatsapp;

  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) {
    return null;
  }

  return { nombre: whatsapp ? "+" + whatsapp : "Invitado", whatsapp: whatsapp || null };
}

function datoDesdeFormulario(formData, p) {
  const campos = Array.isArray(p.central_one_target_fields)
    ? p.central_one_target_fields.map(String)
    : [];

  if (p.proveedor !== "central_one" || campos.length === 0) {
    return String(formData.get("dato_cliente") || "");
  }

  const objeto = {};

  for (const clave of campos) {
    objeto[clave] = String(formData.get("co_" + clave) || "").trim();
  }

  return JSON.stringify(objeto);
}

function leerObjetivoCentralOne(p, crudo) {
  const campos = Array.isArray(p.central_one_target_fields)
    ? p.central_one_target_fields.map(String)
    : [];

  if (p.proveedor !== "central_one" || campos.length === 0) {
    return { ok: true, target: null, texto: null };
  }

  let origen = null;

  try {
    origen = JSON.parse(String(crudo || ""));
  } catch {}

  if (!origen || typeof origen !== "object" || Array.isArray(origen)) {
    return { ok: false };
  }

  const esquema = Array.isArray(p.central_one_target_schema)
    ? p.central_one_target_schema
    : [];

  const target = {};
  const partes = [];

  for (const clave of campos) {
    const valor = String(origen[clave] ?? "").trim();

    if (!valor || valor.length > 64) return { ok: false };

    const def = esquema.find((c) => c && c.key === clave);
    const etiqueta = def && def.label ? String(def.label) : clave;
    let mostrar = valor;

    if (def && def.type === "select") {
      const op = Array.isArray(def.options)
        ? def.options.find((o) => String(o.value) === valor)
        : null;

      if (!op) return { ok: false };

      mostrar = String(op.label || valor);
    }

    target[clave] = valor;
    partes.push(etiqueta + ": " + mostrar);
  }

  return { ok: true, target, texto: partes.join(" · ").slice(0, 200) };
}

async function guardarPedido({ cliente, codigo, total, lineas }) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new Error("El pedido no tiene detalles");
  }

  const registros = lineas.map((l) => ({
    producto_id: Number(l.p.id),
    cantidad: Number(l.cant),
    precio_unit: Number(l.precioUnit),
    dato_cliente: l.datoTexto ?? (l.dato ? String(l.dato).slice(0, 100) : null),
    target_payload: l.target || null,
    plan_id: l.plan ? Number(l.plan.id) : null,
    plan_nombre: l.plan ? l.plan.nombre : null,
    plan_compartida: l.plan && l.plan.compartida != null
      ? l.plan.compartida === true : null,
    costo_unit: l.costoUnit == null ? null : Number(l.costoUnit),
    duracion_dias: l.duracionDias == null
      ? null : Number(l.duracionDias),
    plan_pantallas: l.plan?.pantallas == null ? null : Number(l.plan.pantallas),
    plan_perfiles: l.plan?.perfiles == null ? null : Number(l.plan.perfiles),
    plan_dispositivos: l.plan?.dispositivos || null,
    plan_calidad: l.plan?.calidad || null
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
        dato_cliente, target_payload, plan_id, plan_nombre, plan_compartida, costo_unit,
        duracion_dias, plan_pantallas, plan_perfiles,
        plan_dispositivos, plan_calidad
      )
      SELECT
        np.id, i.producto_id, i.cantidad, i.precio_unit,
        i.dato_cliente, i.target_payload, i.plan_id, i.plan_nombre, i.plan_compartida,
        i.costo_unit, i.duracion_dias,
        i.plan_pantallas, i.plan_perfiles,
        i.plan_dispositivos, i.plan_calidad
      FROM nuevo_pedido np
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(registros)}::jsonb)
      AS i(
        producto_id integer,
        cantidad integer,
        precio_unit numeric,
        dato_cliente text,
        target_payload jsonb,
        plan_id integer,
        plan_nombre text,
        plan_compartida boolean,
        costo_unit numeric,
        duracion_dias integer,
        plan_pantallas integer,
        plan_perfiles integer,
        plan_dispositivos text,
        plan_calidad text
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
  await asegurarEsquema();
  const productoId = Number(formData.get("producto_id"));
  const cantidad = Number(formData.get("cantidad"));

  if (
    !Number.isInteger(productoId) ||
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 5
  ) redirect("/");

  const [p] = await sql`
    SELECT id, slug, tipo, campo_cliente, proveedor, central_one_target_fields, central_one_target_schema,
           precio::float AS precio,
           coalesce(costo_proveedor_bs, costo_proveedor_bs_central_one)::float AS costo_proveedor_bs,
           duracion_dias
    FROM productos
    WHERE id = ${productoId} AND activo AND (proveedor IS NULL OR proveedor_disponible = TRUE)
  `;

  if (!p) redirect("/");

  const cliente = leerCliente(formData);
  if (!cliente) redirect(`/producto/${p.slug}?error=datos`);

  const dato = datoDesdeFormulario(formData, p)
    .trim()
    .slice(0, 600);

  if (p.tipo === "recarga" && p.campo_cliente && !dato) {
    redirect(`/producto/${p.slug}?error=dato`);
  }

  const obj = leerObjetivoCentralOne(p, dato);

  if (!obj.ok) {
    redirect(`/producto/${p.slug}?error=dato`);
  }

  const planes = await sql`
    SELECT id, nombre, precio::float AS precio,
           costo::float AS costo, duracion_dias, compartida,
           pantallas, perfiles, dispositivos, calidad
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
        p, plan, dato, cant, precioUnit, duracionDias,
        target: obj.target, datoTexto: obj.texto,
        costoUnit: plan ? plan.costo : p.costo_proveedor_bs
      }]
    });
  } catch (e) {
    console.error("crear pedido fallo", e);
    redirect(`/producto/${p.slug}?error=fallo`);
  }

  redirect(`/pedido/${codigo}?aviso=pedido_creado`);
}

export async function crearPedidoCarrito(formData) {
  await asegurarEsquema();
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
      SELECT id, tipo, campo_cliente, proveedor, central_one_target_fields, central_one_target_schema,
             precio::float AS precio,
             coalesce(costo_proveedor_bs, costo_proveedor_bs_central_one)::float AS costo_proveedor_bs,
             duracion_dias
      FROM productos
      WHERE id = ${productoId} AND activo AND (proveedor IS NULL OR proveedor_disponible = TRUE)
    `;

    if (!p) redirect("/carrito?error=invalido");

    const dato = String(it?.dato_cliente || "")
      .trim()
      .slice(0, 600);

    if (p.tipo === "recarga" && p.campo_cliente && !dato) {
      redirect("/carrito?error=dato");
    }

    const obj = leerObjetivoCentralOne(p, dato);

    if (!obj.ok) {
      redirect("/carrito?error=dato");
    }

    const planes = await sql`
      SELECT id, nombre, precio::float AS precio,
             costo::float AS costo, duracion_dias, compartida,
           pantallas, perfiles, dispositivos, calidad
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
      target: obj.target,
      datoTexto: obj.texto,
      p,
      plan,
      dato,
      cant: plan ? 1 : cantidad,
      precioUnit: plan ? plan.precio : p.precio,
      duracionDias: plan?.duracion_dias ?? p.duracion_dias ?? null,
      costoUnit: plan ? plan.costo : p.costo_proveedor_bs
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
