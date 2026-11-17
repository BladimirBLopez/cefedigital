"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ipCliente, contar, anotar } from "@/lib/limite";

export async function crearPedido(formData) {
  const productoId = Number(formData.get("producto_id"));
  const cantidad = Number(formData.get("cantidad"));
  const nombre = String(formData.get("nombre") || "").trim().slice(0, 80);
  const whatsapp = String(formData.get("whatsapp") || "").replace(/\D/g, "").slice(0, 15);
  const slug = encodeURIComponent(String(formData.get("slug") || ""));

  if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) redirect("/");
  if (!nombre || whatsapp.length < 8) redirect(`/producto/${slug}?error=datos`);

  const [p] = await sql`
    select p.id, p.slug, p.tipo, p.campo_cliente, p.precio::float as precio,
      99 as disponibles
    from productos p where p.id = ${productoId} and p.activo`;
  if (!p) redirect("/");
  const dato = String(formData.get("dato_cliente") || "").trim().slice(0, 100);
  if (p.tipo === "recarga" && p.campo_cliente && !dato) redirect(`/producto/${p.slug}?error=dato`);

  const ip = await ipCliente();
  if ((await contar("pedido_ip", ip, 60)) >= 8 || (await contar("pedido_wa", whatsapp, 60)) >= 4) redirect(`/producto/${p.slug}?error=limite`);
  await anotar("pedido_ip", ip);
  await anotar("pedido_wa", whatsapp);

  const total = Math.round(p.precio * cantidad * 100) / 100;
  const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();
  const [c] = await sql`insert into clientes (nombre, whatsapp) values (${nombre}, ${whatsapp}) returning id`;
  const [ped] = await sql`insert into pedidos (codigo, cliente_id, total) values (${codigo}, ${c.id}, ${total}) returning id`;
  await sql`
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unit, dato_cliente)
    values (${ped.id}, ${p.id}, ${cantidad}, ${p.precio}, ${dato || null})`;
  redirect(`/pedido/${codigo}`);
}
