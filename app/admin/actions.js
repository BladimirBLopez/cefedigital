"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin, cerrarSesion } from "@/lib/auth";
import { cifrar } from "@/lib/cripto";

function hacerSlug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/login");
}

export async function crearProducto(formData) {
  await requireAdmin();
  const nombre = String(formData.get("nombre") || "").trim();
  const categoria = String(formData.get("categoria") || "").trim() || null;
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const precio = Number(String(formData.get("precio") || "").replace(",", "."));
  if (!nombre) redirect("/admin/productos?error=nombre");
  if (!Number.isFinite(precio) || precio < 0) redirect("/admin/productos?error=precio");

  const base = hacerSlug(nombre) || "producto";
  let r = await sql`
    insert into productos (nombre, slug, descripcion, categoria, precio)
    values (${nombre}, ${base}, ${descripcion}, ${categoria}, ${precio})
    on conflict (slug) do nothing returning id`;
  if (r.length === 0) {
    const slug2 = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      insert into productos (nombre, slug, descripcion, categoria, precio)
      values (${nombre}, ${slug2}, ${descripcion}, ${categoria}, ${precio})`;
  }
  revalidatePath("/admin/productos");
  redirect("/admin/productos?ok=1");
}

export async function cambiarActivo(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`update productos set activo = not activo where id = ${id}`;
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
  revalidatePath("/admin/stock");
  redirect(`/admin/stock?ok=${lineas.length}`);
}

export async function borrarStock(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await sql`delete from stock where id = ${id} and estado = 'disponible'`;
  revalidatePath("/admin/stock");
}

export async function editarProducto(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/productos");
  const base = `/admin/productos/${id}`;
  const nombre = String(formData.get("nombre") || "").trim();
  const categoria = String(formData.get("categoria") || "").trim() || null;
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const precio = Number(String(formData.get("precio") || "").replace(",", "."));
  const imagen = String(formData.get("imagen_url") || "").trim();
  const instrucciones = String(formData.get("instrucciones") || "").trim().slice(0, 2000) || null;
  if (!nombre) redirect(`${base}?error=nombre`);
  if (!Number.isFinite(precio) || precio < 0) redirect(`${base}?error=precio`);
  if (imagen && !/^https:\/\//i.test(imagen)) redirect(`${base}?error=imagen`);
  await sql`
    update productos
    set nombre = ${nombre}, categoria = ${categoria}, descripcion = ${descripcion},
        precio = ${precio}, imagen_url = ${imagen || null}, instrucciones = ${instrucciones}
    where id = ${id}`;
  revalidatePath("/");
  revalidatePath("/admin/productos");
  redirect(`${base}?ok=1`);
}
