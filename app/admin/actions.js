"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin, cerrarSesion } from "@/lib/auth";
import { cifrar } from "@/lib/cripto";
import { anotar } from "@/lib/registro";

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
    r = await sql`
      insert into productos (nombre, slug, descripcion, categoria, precio)
      values (${nombre}, ${slug2}, ${descripcion}, ${categoria}, ${precio})
      returning id`;
  }
  await anotar("crear", "producto", r[0]?.id, `Creó "${nombre}" a Bs ${precio.toFixed(2)}`);
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
  const p = await sql`select nombre from productos where id = ${id}`;
  await anotar("stock_agregar", "stock", id, `Agregó ${lineas.length} al stock de "${p[0]?.nombre ?? id}"`);
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
    const p = await sql`select nombre from productos where id = ${r[0].producto_id}`;
    await anotar("stock_borrar", "stock", r[0].producto_id, `Borró 1 del stock de "${p[0]?.nombre ?? r[0].producto_id}"`);
  }
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
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
  const tipoForm = String(formData.get("tipo") || "clave");
  const tipo = ["clave", "cuenta", "recarga"].includes(tipoForm) ? tipoForm : "clave";
  const campoCliente = tipo === "recarga"
    ? (String(formData.get("campo_cliente") || "").trim().slice(0, 60) || "Tu ID de jugador")
    : null;
  if (!nombre) redirect(`${base}?error=nombre`);
  if (!Number.isFinite(precio) || precio < 0) redirect(`${base}?error=precio`);
  if (imagen && !/^https:\/\//i.test(imagen)) redirect(`${base}?error=imagen`);

  const antesFilas = await sql`
    select nombre, categoria, descripcion, precio::float as precio, imagen_url,
           instrucciones, tipo, campo_cliente
    from productos where id = ${id}`;
  const antes = antesFilas[0] || null;

  await sql`
    update productos
    set nombre = ${nombre}, categoria = ${categoria}, descripcion = ${descripcion},
        precio = ${precio}, imagen_url = ${imagen || null}, instrucciones = ${instrucciones},
        tipo = ${tipo}, campo_cliente = ${campoCliente}
    where id = ${id}`;

  const nuevo = {
    nombre, categoria, descripcion, precio,
    imagen_url: imagen || null, instrucciones, tipo, campo_cliente: campoCliente,
  };
  const etiqueta = {
    nombre: "nombre", categoria: "categoría", descripcion: "descripción", precio: "precio",
    imagen_url: "imagen", instrucciones: "instrucciones", tipo: "tipo", campo_cliente: "campo del cliente",
  };
  const cambios = [];
  for (const k of Object.keys(nuevo)) {
    const a = antes?.[k] ?? null;
    const b = nuevo[k] ?? null;
    if (String(a) === String(b)) continue;
    if (k === "precio") cambios.push(`precio Bs ${a} → Bs ${b}`);
    else if (k === "nombre" || k === "categoria" || k === "tipo") cambios.push(`${etiqueta[k]}: ${a ?? "—"} → ${b ?? "—"}`);
    else cambios.push(etiqueta[k]);
  }
  if (cambios.length) await anotar("editar", "producto", id, `Editó "${nombre}": ${cambios.join(", ")}`);

  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/registro");
  redirect(`${base}?ok=1`);
}
