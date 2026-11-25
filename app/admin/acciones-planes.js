
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import { modalidadDeForm, normalizarModalidad, textoModalidad, compartidaDe } from "@/lib/modalidades";
import { textoDuracion } from "@/lib/duracion";
import { normalizarDispositivos, normalizarCalidad } from "@/lib/caracteristicas-plan";

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
  await asegurarEsquema();

  const pid = Number(formData.get("producto_id"));
  if (!Number.isInteger(pid)) redirect("/admin/productos");

  const pantallas = entero(formData.get("pantallas"), 1, 10);
  const mesesForm = entero(formData.get("meses_pagados"), 1, 36);
  const dias = entero(formData.get("duracion_dias"), 1, 1095) ?? (mesesForm ? mesesForm * 30 : null);
  const pagados = dias ? Math.max(1, Math.round(dias / 30)) : null;
  const precio = dinero(formData.get("precio"));
  const costo = dinero(formData.get("costo"));
  const modal = modalidadDeForm(formData);
  const compartida = compartidaDe(modal);
  const perfiles = entero(formData.get("perfiles") || 1, 1, 20);
  const dispositivos = normalizarDispositivos(formData.get("dispositivos"));
  const calidadRaw = String(formData.get("calidad") || "").trim();
  const calidad = normalizarCalidad(calidadRaw);

  if (!pantallas || !dias) redirect(`${ruta(pid)}?error=datos`);
  if (!perfiles || (calidadRaw && !calidad)) redirect(`${ruta(pid)}?error=caracteristicas`);
  if (precio === null || Number.isNaN(precio)) redirect(`${ruta(pid)}?error=precio`);
  if (Number.isNaN(costo)) redirect(`${ruta(pid)}?error=costo`);

  const dup = await sql`
    select 1 from planes
    where producto_id = ${pid}
      and pantallas = ${pantallas}
      and duracion_dias = ${dias}
      and modalidad is not distinct from ${modal || null}::text
    limit 1`;

  if (dup.length > 0) redirect(`${ruta(pid)}?error=repetido`);

  const perfil = pantallas === 1 ? "1 pantalla" : `${pantallas} pantallas`;
  const etiqueta = textoModalidad(modal);
  const nombre = `${perfil} · ${textoDuracion(dias)}${etiqueta ? ` · ${etiqueta}` : ""}`;
  const duracion = dias;
  const orden = pantallas * 100 + pagados;

  await sql`
    insert into planes (
      producto_id, perfil, pantallas, perfiles, dispositivos, calidad, meses_pagados, meses_gratis,
      duracion_dias, nombre, costo, precio, compartida, modalidad, activo, orden
    )
    values (
      ${pid}, ${perfil}, ${pantallas}, ${perfiles}, ${dispositivos || null}, ${calidad || null}, ${pagados}, 0,
      ${duracion}, ${nombre}, ${costo}, ${precio}, ${compartida}, ${modal || null}, true, ${orden}
    )`;

  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_agregado`);
}

export async function editarPrecioPlan(formData) {
  await requireAdmin();
  await asegurarEsquema();

  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));

  if (!Number.isInteger(pid) || !Number.isInteger(id)) redirect("/admin/productos");

  const precio = dinero(formData.get("precio"));
  const costo = dinero(formData.get("costo"));
  const perfiles = entero(formData.get("perfiles") || 1, 1, 20);
  const dispositivos = normalizarDispositivos(formData.get("dispositivos"));
  const calidadRaw = String(formData.get("calidad") || "").trim();
  const calidad = normalizarCalidad(calidadRaw);

  if (precio === null || Number.isNaN(precio)) redirect(`${ruta(pid)}?error=precio`);
  if (Number.isNaN(costo)) redirect(`${ruta(pid)}?error=costo`);
  if (!perfiles || (calidadRaw && !calidad)) redirect(`${ruta(pid)}?error=caracteristicas`);

  await sql`
    update planes set precio = ${precio}, costo = ${costo},
      perfiles = ${perfiles}, dispositivos = ${dispositivos || null},
      calidad = ${calidad || null}
    where id = ${id} and producto_id = ${pid}`;

  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_actualizado`);
}

export async function editarModalidadPlan(formData) {
  await requireAdmin();
  await asegurarEsquema();

  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));

  if (!Number.isInteger(pid) || !Number.isInteger(id)) {
    redirect("/admin/productos");
  }

  const modal = normalizarModalidad(formData.get("modalidad"));
  const compartida = compartidaDe(modal);

  const [plan] = await sql`
    select pl.id, pl.perfil, pl.pantallas, pl.duracion_dias,
           pr.slug
    from planes pl
    join productos pr on pr.id = pl.producto_id
    where pl.id = ${id}
      and pl.producto_id = ${pid}
  `;

  if (!plan) {
    redirect(`${ruta(pid)}?error=plan_no_existe`);
  }

  const duplicado = await sql`
    select 1
    from planes
    where producto_id = ${pid}
      and pantallas = ${plan.pantallas}
      and duracion_dias = ${plan.duracion_dias}
      and modalidad is not distinct from ${modal || null}::text
      and id <> ${id}
    limit 1
  `;

  if (duplicado.length > 0) {
    redirect(`${ruta(pid)}?error=repetido`);
  }

  const base = `${plan.perfil} · ${textoDuracion(plan.duracion_dias)}`;

  const etiqueta = textoModalidad(modal);
  const nombre = etiqueta ? `${base} · ${etiqueta}` : base;

  await sql`
    update planes
    set compartida = ${compartida},
        modalidad = ${modal || null},
        nombre = ${nombre}
    where id = ${id}
      and producto_id = ${pid}
  `;

  revalidatePath(ruta(pid));
  revalidatePath(`/producto/${plan.slug}`);
  revalidatePath("/");

  redirect(`${ruta(pid)}?aviso=modalidad_actualizada`);
}

export async function cambiarActivoPlan(formData) {
  await requireAdmin();

  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));

  if (!Number.isInteger(pid) || !Number.isInteger(id)) redirect("/admin/productos");

  const r = await sql`
    update planes set activo = not activo
    where id = ${id} and producto_id = ${pid}
    returning activo`;

  if (!r[0]) redirect(`${ruta(pid)}?error=plan_no_existe`);

  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");

  redirect(`${ruta(pid)}?aviso=${r[0].activo ? "plan_activado" : "plan_desactivado"}`);
}

export async function borrarPlan(formData) {
  await requireAdmin();
  await asegurarEsquema();

  const pid = Number(formData.get("producto_id"));
  const id = Number(formData.get("id"));

  if (!Number.isInteger(pid) || !Number.isInteger(id)) return;

  const usado = await sql`
    select 1 from pedido_items where plan_id = ${id} limit 1`;

  if (usado.length > 0) redirect(`${ruta(pid)}?error=usado`);

  await sql`delete from planes where id = ${id} and producto_id = ${pid}`;

  await sincronizarPrecio(pid);
  revalidatePath(ruta(pid));
  revalidatePath("/");
  redirect(`${ruta(pid)}?aviso=plan_borrado`);
}
