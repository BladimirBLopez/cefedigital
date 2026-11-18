"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin, cerrarSesion } from "@/lib/auth";
import { cifrar } from "@/lib/cripto";
import { anotar } from "@/lib/registro";
import { asegurarEsquema } from "@/lib/esquema";
import { subirFoto } from "@/lib/cloudinary";

function hacerSlug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function esFecha(t) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  try {
    return new Date(t + "T00:00:00Z").toISOString().slice(0, 10) === t;
  } catch {
    return false;
  }
}

function leerProducto(formData) {
  const nombre = String(formData.get("nombre") || "").trim();
  const categoria = String(formData.get("categoria") || "").trim() || null;
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const precio = Number(String(formData.get("precio") || "").replace(",", "."));
  const instrucciones = String(formData.get("instrucciones") || "").trim().slice(0, 2000) || null;
  const tipoForm = String(formData.get("tipo") || "clave");
  const tipo = ["clave", "cuenta", "recarga"].includes(tipoForm) ? tipoForm : "clave";
  const campoCliente =
    tipo === "recarga"
      ? String(formData.get("campo_cliente") || "").trim().slice(0, 60) || "Tu ID de jugador"
      : null;
  const venceTxt = String(formData.get("vence") || "").trim();
  const vence = venceTxt && esFecha(venceTxt) ? venceTxt : null;
  const durTxt = String(formData.get("duracion_dias") || "").trim();
  const duracion = durTxt ? Number(durTxt) : null;
  let error = null;
  if (!nombre) error = "nombre";
  else if (!Number.isFinite(precio) || precio < 0) error = "precio";
  else if (venceTxt && !vence) error = "vence";
  else if (durTxt && (!Number.isInteger(duracion) || duracion < 1 || duracion > 3650)) error = "duracion";
  return { nombre, categoria, descripcion, precio, instrucciones, tipo, campoCliente, vence, duracion, error };
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/login");
}

export async function crearProducto(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const p = leerProducto(formData);
  if (p.error) redirect(`/admin/productos?error=${p.error}`);

  let imagen = null;
  try {
    imagen = await subirFoto(formData.get("foto"));
  } catch {
    redirect("/admin/productos?error=foto");
  }

  const base = hacerSlug(p.nombre) || "producto";
  let r = await sql`
    insert into productos (nombre, slug, descripcion, categoria, precio, tipo, campo_cliente, vence, imagen_url)
    values (${p.nombre}, ${base}, ${p.descripcion}, ${p.categoria}, ${p.precio}, ${p.tipo}, ${p.campoCliente}, ${p.vence}, ${imagen})
    on conflict (slug) do nothing returning id`;
  if (r.length === 0) {
    const slug2 = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    r = await sql`
      insert into productos (nombre, slug, descripcion, categoria, precio, tipo, campo_cliente, vence, imagen_url)
      values (${p.nombre}, ${slug2}, ${p.descripcion}, ${p.categoria}, ${p.precio}, ${p.tipo}, ${p.campoCliente}, ${p.vence}, ${imagen})
      returning id`;
  }
  if (p.duracion && r[0]?.id) await sql`update productos set duracion_dias = ${p.duracion} where id = ${r[0].id}`;
  if (p.tipo === "cuenta" && r[0]?.id && formData.get("meses_pagados")) {
    const pant = Number(formData.get("pantallas"));
    const pag = Number(formData.get("meses_pagados"));
    const gra = Number(formData.get("meses_gratis") || 0);
    const cTxt = String(formData.get("plan_costo") || "").trim().replace(",", ".");
    const costo = cTxt === "" ? null : Number(cTxt);
    const okInt = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
    if (okInt(pant, 1, 10) && okInt(pag, 1, 36) && okInt(gra, 0, 12) && (costo === null || (Number.isFinite(costo) && costo >= 0))) {
      const perfil = pant === 1 ? "1 pantalla" : `${pant} pantallas`;
      const nombrePlan = `${perfil} · ${pag} ${pag === 1 ? "mes" : "meses"}${gra > 0 ? ` + ${gra} gratis` : ""}`;
      await sql`
        insert into planes (producto_id, perfil, pantallas, meses_pagados, meses_gratis, duracion_dias, nombre, costo, precio, activo, orden)
        values (${r[0].id}, ${perfil}, ${pant}, ${pag}, ${gra}, ${(pag + gra) * 30}, ${nombrePlan}, ${costo}, ${p.precio}, true, ${pant * 100 + pag})`;
    }
  }
  await anotar(
    "crear",
    "producto",
    r[0]?.id,
    `Creó "${p.nombre}" a Bs ${p.precio.toFixed(2)}${p.vence ? ` · vence ${p.vence}` : ""}`
  );
  revalidatePath("/");
  revalidatePath("/admin/productos");
  redirect("/admin/productos?ok=1");
}

export async function cambiarActivo(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const r = await sql`
    update productos set activo = not activo where id = ${id}
    returning nombre, activo`;
  if (r[0]) {
    await anotar(
      r[0].activo ? "activar" : "ocultar",
      "producto",
      id,
      `${r[0].activo ? "Puso a la venta" : "Ocultó"} "${r[0].nombre}"`
    );
  }
  revalidatePath("/");
  revalidatePath("/admin/productos");
}

export async function agregarStock(formData) {
  await requireAdmin();
  const id = Number(formData.get("producto_id"));
  const lineas = String(formData.get("datos") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500);
  if (!Number.isInteger(id)) redirect("/admin/stock?error=producto");
  if (lineas.length === 0) redirect("/admin/stock?error=vacio");
  await sql`
    insert into stock (producto_id, dato)
    select ${id}, unnest(${lineas.map((l) => cifrar(l))}::text[])`;
  const pr = await sql`select nombre from productos where id = ${id}`;
  await anotar("stock_agregar", "stock", id, `Agregó ${lineas.length} al stock de "${pr[0]?.nombre ?? id}"`);
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
  redirect(`/admin/stock?ok=${lineas.length}`);
}

export async function borrarStock(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const r = await sql`
    delete from stock where id = ${id} and estado = 'disponible'
    returning producto_id`;
  if (r[0]) {
    const pr = await sql`select nombre from productos where id = ${r[0].producto_id}`;
    await anotar("stock_borrar", "stock", r[0].producto_id, `Borró 1 del stock de "${pr[0]?.nombre ?? r[0].producto_id}"`);
  }
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
}

export async function editarProducto(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/productos");
  const base = `/admin/productos/${id}`;
  const p = leerProducto(formData);
  if (p.error) redirect(`${base}?error=${p.error}`);

  const actual = String(formData.get("imagen_url") || "").trim();
  if (actual && !/^https:\/\//i.test(actual)) redirect(`${base}?error=imagen`);
  let nueva = null;
  try {
    nueva = await subirFoto(formData.get("foto"));
  } catch {
    redirect(`${base}?error=foto`);
  }
  const imagen = nueva || actual || null;

  const antesFilas = await sql`
    select nombre, categoria, descripcion, precio::float as precio, imagen_url,
           instrucciones, tipo, campo_cliente, vence::text as vence, duracion_dias
    from productos where id = ${id}`;
  const antes = antesFilas[0] || null;

  await sql`
    update productos
    set nombre = ${p.nombre}, categoria = ${p.categoria}, descripcion = ${p.descripcion},
        precio = ${p.precio}, imagen_url = ${imagen}, instrucciones = ${p.instrucciones},
        tipo = ${p.tipo}, campo_cliente = ${p.campoCliente}, vence = ${p.vence}, duracion_dias = ${p.duracion}
    where id = ${id}`;

  const nuevo = {
    nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, precio: p.precio,
    imagen_url: imagen, instrucciones: p.instrucciones, tipo: p.tipo,
    campo_cliente: p.campoCliente, vence: p.vence, duracion_dias: p.duracion,
  };
  const etiqueta = {
    nombre: "nombre", categoria: "categoría", descripcion: "descripción", precio: "precio",
    imagen_url: "imagen", instrucciones: "instrucciones", tipo: "tipo",
    campo_cliente: "campo del cliente", vence: "vencimiento", duracion_dias: "duración en días",
  };
  const cambios = [];
  for (const k of Object.keys(nuevo)) {
    const a = antes?.[k] ?? null;
    const b = nuevo[k] ?? null;
    if (String(a) === String(b)) continue;
    if (k === "precio") cambios.push(`precio Bs ${a} → Bs ${b}`);
    else if (["nombre", "categoria", "tipo", "vence"].includes(k)) cambios.push(`${etiqueta[k]}: ${a ?? "—"} → ${b ?? "—"}`);
    else cambios.push(etiqueta[k]);
  }
  if (cambios.length) await anotar("editar", "producto", id, `Editó "${p.nombre}": ${cambios.join(", ")}`);

  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/registro");
  redirect(`${base}?ok=1`);
}
