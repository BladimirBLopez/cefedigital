"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const ruta = (id) => `/admin/productos/${id}/planes`;

async function sincronizarPrecio(pid) {
  await sql`
    update productos
    set precio = coalesce((select min(precio) from planes where producto_id = ${pid} and activo), precio)
    where id = ${pid}`;
}

function entero(v, min, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function dinero(v) {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

export async function agregarPlan(formData) {
  await requireAdmin();
  const pid = Number(formData.get("producto_id"));
  if (!Number.isInteger(pid)) redirect("/admin/productos");
  const pantallas = entero(formData.get("pantallas"), 1, 10);
  const pagados = entero(formData.get("meses_pagados"), 1, 36);
  const gratis = entero(formData.get("meses_gratis"), 0, 12);
  const precio = dinero(formData.get("precio"));
  const costo = dinero(formData.get("costo"));
  if (!pantallas || !pagados || gratis === null) redirect(`${ruta(pid)}?error=datos`);
  if (precio === null || Number.isNaN(precio)) redirect(`${ruta(pid)}?error=precio`);
  if (Number.isNaN(costo)) redirect(`${ruta(pid)}?error=costo`);

  const dup = await sql`
    select 1 from planes
    where producto_id = ${pid} and pantallas = ${pantallas}
      and meses_pagados = ${pagados} and meses_gratis = ${gratis} limit 1`;
  if (dup.length > 0) redirect(`${ruta(pid)}?error=repetido`);

  const perfil = pantallas === 1 ? "1 pantalla" : `${pantallas} pantallas`;
  const total = pagados + gratis;
  const nombre = `${perfil} · ${pagados} ${pagados === 1 ? "mes" : "meses"}${gratis > 0 ? ` + ${gratis} gratis` : ""}`;
  const duracion = total * 30;
  const orden = pantallas * 100 + pagados;
  await sql`
    insert into planes (producto_id, perfil, pantallas, meses_pagados, meses_gratis, duracion_dias, nombre, costo, precio, activo, orden)
    values (${pid}, ${perfil}, ${pantallas}, ${pagados}, ${gratis}, ${duracion}, ${nombre}, ${costo}, ${precio}, true, ${orden})`;
  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_agregado`);
}

export async function editarPrecioPlan(formData) {
  await requireAdmin();
  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));
  if (!Number.isInteger(pid) || !Number.isInteger(id)) redirect("/admin/productos");
  const precio = dinero(formData.get("precio"));
  const costo = dinero(formData.get("costo"));
  if (precio === null || Number.isNaN(precio)) redirect(`${ruta(pid)}?error=precio`);
  if (Number.isNaN(costo)) redirect(`${ruta(pid)}?error=costo`);
  await sql`update planes set precio = ${precio}, costo = ${costo} where id = ${id} and producto_id = ${pid}`;
  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_actualizado`);
}

export async function cambiarActivoPlan(formData) {
  await requireAdmin();
  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));

  if (!Number.isInteger(pid) || !Number.isInteger(id)) {
    redirect("/admin/productos");
  }

  const r = await sql`
    update planes
    set activo = not activo
    where id = ${id} and producto_id = ${pid}
    returning activo`;

  if (!r[0]) redirect(`${ruta(pid)}?error=plan_no_existe`);

  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");

  redirect(
    `${ruta(pid)}?aviso=${r[0].activo ? "plan_activado" : "plan_desactivado"}`
  );
}

export async function borrarPlan(formData) {
  await requireAdmin();
  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));
  if (!Number.isInteger(pid) || !Number.isInteger(id)) return;
  const usado = await sql`select 1 from pedido_items where plan_id = ${id} limit 1`;
  if (usado.length > 0) redirect(`${ruta(pid)}?error=usado`);
  await sql`delete from planes where id = ${id} and producto_id = ${pid}`;
  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_borrado`);
}
