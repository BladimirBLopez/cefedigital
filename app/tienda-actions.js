"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar } from "@/lib/limite";

export async function crearPedido(formData) {
  const productoId = Number(formData.get("producto_id"));
  const cantidad = Number(formData.get("cantidad"));
  
  
  const slug = encodeURIComponent(String(formData.get("slug") || ""));

  if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) redirect("/");

  const [p] = await sql`
    select p.id, p.slug, p.tipo, p.campo_cliente, p.precio::float as precio,
      99 as disponibles
    from productos p where p.id = ${productoId} and p.activo`;
  if (!p) redirect("/");
  const dato = String(formData.get("dato_cliente") || "").trim().slice(0, 100);
  if (p.tipo === "recarga" && p.campo_cliente && !dato) redirect(`/producto/${p.slug}?error=dato`);
  const planes = await sql`select id, nombre, precio::float as precio, costo::float as costo from planes where producto_id = ${p.id} and activo`;
  const plan = planes.find((x) => String(x.id) === String(formData.get("plan_id") || ""));
  if (planes.length > 0 && !plan) redirect(`/producto/${p.slug}?error=plan`);
  const cant = plan ? 1 : cantidad;
  const precioUnit = plan ? plan.precio : p.precio;

  const ip = await ipCliente();
  if ((await contar("pedido_ip", ip, 60)) >= 8) redirect(`/producto/${p.slug}?error=limite`);
  await anotar("pedido_ip", ip);
  

  const total = Math.round(precioUnit * cant * 100) / 100;
  const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();
  const [c] = await sql`insert into clientes (nombre, whatsapp) values (${"Cliente " + codigo}, '') returning id`;
  const [ped] = await sql`insert into pedidos (codigo, cliente_id, total) values (${codigo}, ${c.id}, ${total}) returning id`;
  await sql`
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unit, dato_cliente, plan_id, plan_nombre, costo_unit)
    values (${ped.id}, ${p.id}, ${cant}, ${precioUnit}, ${dato || null}, ${plan ? plan.id : null}, ${plan ? plan.nombre : null}, ${plan ? plan.costo : null})`;
  redirect(`/pedido/${codigo}?aviso=pedido_creado`);
}

export async function crearPedidoCarrito(formData) {
  
  
  let items = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {}
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) redirect("/carrito?error=vacio");

  const lineas = [];
  for (const it of items) {
    const productoId = Number(it?.producto_id);
    const cantidad = Number(it?.cantidad);
    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) redirect("/carrito?error=invalido");
    const [p] = await sql`select id, tipo, campo_cliente, precio::float as precio from productos where id = ${productoId} and activo`;
    if (!p) redirect("/carrito?error=invalido");
    const dato = String(it?.dato_cliente || "").trim().slice(0, 100);
    if (p.tipo === "recarga" && p.campo_cliente && !dato) redirect("/carrito?error=dato");
    const planes = await sql`select id, nombre, precio::float as precio, costo::float as costo from planes where producto_id = ${p.id} and activo`;
    const plan = planes.find((x) => String(x.id) === String(it?.plan_id || ""));
    if (planes.length > 0 && !plan) redirect("/carrito?error=invalido");
    lineas.push({ p, plan, dato, cant: plan ? 1 : cantidad, precioUnit: plan ? plan.precio : p.precio });
  }

  const ip = await ipCliente();
  if ((await contar("pedido_ip", ip, 60)) >= 8) redirect("/carrito?error=limite");
  await anotar("pedido_ip", ip);
  

  const total = Math.round(lineas.reduce((s, l) => s + l.precioUnit * l.cant, 0) * 100) / 100;
  const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();
  let pedId = null;
  try {
    const [c] = await sql`insert into clientes (nombre, whatsapp) values (${"Cliente " + codigo}, '') returning id`;
    const [ped] = await sql`insert into pedidos (codigo, cliente_id, total) values (${codigo}, ${c.id}, ${total}) returning id`;
    pedId = ped.id;
    for (const l of lineas) {
      await sql`
        insert into pedido_items (pedido_id, producto_id, cantidad, precio_unit, dato_cliente, plan_id, plan_nombre, costo_unit)
        values (${pedId}, ${l.p.id}, ${l.cant}, ${l.precioUnit}, ${l.dato || null}, ${l.plan ? l.plan.id : null}, ${l.plan ? l.plan.nombre : null}, ${l.plan ? l.plan.costo : null})`;
    }
  } catch {
    if (pedId) {
      try {
        await sql`delete from pedido_items where pedido_id = ${pedId}`;
        await sql`delete from pedidos where id = ${pedId}`;
      } catch {}
    }
    redirect("/carrito?error=fallo");
  }
  redirect(`/pedido/${codigo}?nuevo=1&aviso=pedido_creado`);
}
