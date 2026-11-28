"use server";

import { normalizarModalidad, textoModalidad, compartidaDe } from "@/lib/modalidades";
import { textoDuracion } from "@/lib/duracion";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin, cerrarSesion } from "@/lib/auth";
import { anotar } from "@/lib/registro";
import { asegurarEsquema } from "@/lib/esquema";
import { subirFoto } from "@/lib/cloudinary";
import { normalizarDispositivos, normalizarCalidad } from "@/lib/caracteristicas-plan";

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

const CATEGORIAS = { clave: "Licencias", cuenta: "Streaming / IPTV", recarga: "Recargas de juegos" };

async function unificarCategoria(cat, id = 0) {
  if (!cat) return null;
  const limpia = cat.replace(/\s+/g, " ").trim();
  const r = await sql`select categoria from productos where lower(categoria) = lower(${limpia}) and id <> ${id} limit 1`;
  return r[0]?.categoria || limpia;
}

function leerProducto(formData) {
  const nombre = String(formData.get("nombre") || "").trim();
  const categoria = String(formData.get("categoria") || "").trim() || null;
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const precio = Number(String(formData.get("precio") || "").replace(",", "."));
  const instrucciones = String(formData.get("instrucciones") || "").trim().slice(0, 2000) || null;
  const tipoForm = String(formData.get("tipo") || "");
  const tipo = ["clave", "cuenta", "recarga"].includes(tipoForm) ? tipoForm : "";
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
  else if (!tipo) error = "tipo";
  else if (!Number.isFinite(precio) || precio < 0 || (tipo !== "cuenta" && precio <= 0)) error = "precio";
  else if (venceTxt && !vence) error = "vence";
  else if (durTxt && (!Number.isInteger(duracion) || duracion < 1 || duracion > 3650)) error = "duracion";
  return { nombre, categoria, descripcion, precio, instrucciones, tipo, campoCliente, vence, duracion, error };
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/login?aviso=sesion_cerrada");
}

export async function crearProducto(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const p = leerProducto(formData);
  if (p.error) redirect(`/admin/productos/nuevo?error=${p.error}`);
  p.categoria = (await unificarCategoria((p.categoria || "").slice(0, 40))) || CATEGORIAS[p.tipo];

  const planesNuevos = [];
  let precioProducto = p.precio;
  if (p.tipo === "cuenta") {
    const okInt = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
    const dinero = (v) => {
      const t = String(v ?? "").trim().replace(",", ".");
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    };
    const pants = formData.getAll("plan_pant").map(Number);
    const diasF = formData.getAll("plan_dias").map(Number);
    const preciosF = formData.getAll("plan_precio");
    const costosF = formData.getAll("plan_costo");
    const modalidadesF = formData.getAll("plan_modalidad");
    const perfilesF = formData.getAll("plan_perfiles");
    const dispositivosF = formData.getAll("plan_dispositivos");
    const calidadesF = formData.getAll("plan_calidad");
    const vistos = new Set();
    for (let i = 0; i < pants.length; i++) {
      const pant = pants[i];
      const m = diasF[i];
      if (!okInt(pant, 1, 10) || !okInt(m, 1, 3650)) continue;
      const pr = dinero(preciosF[i]);
      const co = dinero(costosF[i]);
      const modalidad = normalizarModalidad(modalidadesF[i]);
      const compartida = compartidaDe(modalidad);
      const perfilesTxt = String(perfilesF[i] ?? "").trim();
      const perfiles = perfilesTxt ? Number(perfilesTxt) : 1;
      const dispositivos = normalizarDispositivos(dispositivosF[i]);
      const calidadRaw = String(calidadesF[i] ?? "").trim();
      const calidad = normalizarCalidad(calidadRaw);
      if (!okInt(perfiles, 1, 20) || (calidadRaw && !calidad)) {
        redirect("/admin/productos/nuevo?error=caracteristicas");
      }
      if (Number.isNaN(pr) || Number.isNaN(co)) redirect("/admin/productos/nuevo?error=precio");
      if (pr === null) continue;

      const clavePlan = `${pant}-${m}-${modalidad || "x"}`;
      if (vistos.has(clavePlan)) redirect("/admin/productos/nuevo?error=repetidas");
      vistos.add(clavePlan);

      planesNuevos.push({
        perfil: pant === 1 ? "1 pantalla" : `${pant} pantallas`,
        pant,
        m,
        modalidad,
        compartida,
        perfiles,
        dispositivos,
        calidad,
        precio: Math.round(pr * 100) / 100,
        costo: co === null ? 0 : Math.round(co * 100) / 100,
      });
    }
    if (planesNuevos.length === 0) redirect("/admin/productos/nuevo?error=planes");
    precioProducto = Math.min(...planesNuevos.map((x) => x.precio));
  }

  let imagen = null;
  try {
    imagen = await subirFoto(formData.get("foto"));
  } catch {
    redirect("/admin/productos/nuevo?error=foto");
  }

  const base = hacerSlug(p.nombre) || "producto";
  let r = await sql`
    insert into productos (nombre, slug, descripcion, categoria, precio, tipo, campo_cliente, vence, imagen_url)
    values (${p.nombre}, ${base}, ${p.descripcion}, ${p.categoria}, ${precioProducto}, ${p.tipo}, ${p.campoCliente}, ${p.vence}, ${imagen})
    on conflict (slug) do nothing returning id`;
  if (r.length === 0) {
    const slug2 = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    r = await sql`
      insert into productos (nombre, slug, descripcion, categoria, precio, tipo, campo_cliente, vence, imagen_url)
      values (${p.nombre}, ${slug2}, ${p.descripcion}, ${p.categoria}, ${precioProducto}, ${p.tipo}, ${p.campoCliente}, ${p.vence}, ${imagen})
      returning id`;
  }
  if (p.duracion && r[0]?.id) await sql`update productos set duracion_dias = ${p.duracion} where id = ${r[0].id}`;
  if (p.instrucciones && r[0]?.id) await sql`update productos set instrucciones = ${p.instrucciones} where id = ${r[0].id}`;
  if (String(formData.get("activo")) === "0" && r[0]?.id) await sql`update productos set activo = false where id = ${r[0].id}`;
  if (p.tipo === "cuenta" && r[0]?.id) {
    let falloPlanes = false;
    try {
      for (const x of planesNuevos) {
        const etiquetaMod = textoModalidad(x.modalidad);
        const nombrePlan = `${x.perfil} · ${textoDuracion(x.m)}${etiquetaMod ? ` · ${etiquetaMod}` : ""}`;
        await sql`
          insert into planes (
            producto_id, perfil, pantallas, perfiles, dispositivos, calidad, meses_pagados, meses_gratis,
            duracion_dias, nombre, costo, precio, compartida, modalidad, activo, orden
          )
          values (
            ${r[0].id}, ${x.perfil}, ${x.pant}, ${x.perfiles}, ${x.dispositivos || null}, ${x.calidad || null}, ${Math.max(1, Math.round(x.m / 30))}, ${0},
            ${x.m}, ${nombrePlan}, ${x.costo}, ${x.precio},
            ${x.compartida}, ${x.modalidad || null}, true, ${x.pant * 1000 + x.m}
          )`;
      }
    } catch (e) {
      console.error("crear planes fallo", e);
      falloPlanes = true;
    }
    if (falloPlanes) {
      await sql`delete from planes where producto_id = ${r[0].id}`;
      await sql`delete from productos where id = ${r[0].id}`;
      redirect("/admin/productos/nuevo?error=planesdb");
    }
  }
  await anotar(
    "crear",
    "producto",
    r[0]?.id,
    `Creó "${p.nombre}" a Bs ${precioProducto.toFixed(2)}${p.vence ? ` · vence ${p.vence}` : ""}`
  );
  revalidatePath("/");
  revalidatePath("/admin/productos");
  redirect("/admin/productos?aviso=producto_creado");
}

export async function cambiarDestacado(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false };

  const r = await sql`
    update productos set destacado = not destacado where id = ${id}
    returning nombre, destacado`;

  if (!r[0]) return { ok: false };

  await anotar(
    "editar",
    "producto",
    id,
    `${r[0].destacado ? "Marcó como destacado" : "Quitó de destacados"} "${r[0].nombre}"`
  );

  revalidatePath("/");
  revalidatePath("/admin/productos");

  return { ok: true, destacado: r[0].destacado };
}

export async function cambiarActivo(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { ok: false };

  const r = await sql`
    update productos set activo = not activo where id = ${id}
    returning nombre, activo`;

  if (!r[0]) return { ok: false };

  await anotar(
    r[0].activo ? "activar" : "ocultar",
    "producto",
    id,
    `${r[0].activo ? "Puso a la venta" : "Ocultó"} "${r[0].nombre}"`
  );

  revalidatePath("/");
  revalidatePath("/admin/productos");

  return { ok: true, activo: r[0].activo };
}

export async function editarProducto(formData) {
  await requireAdmin();
  await asegurarEsquema();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/productos");
  const base = `/admin/productos/${id}`;
  const p = leerProducto(formData);
  if (p.error) redirect(`${base}?error=${p.error}`);
  p.categoria = formData.has("categoria")
    ? (await unificarCategoria((p.categoria || "").slice(0, 40), id)) || CATEGORIAS[p.tipo]
    : (await sql`select categoria from productos where id = ${id}`)[0]?.categoria || CATEGORIAS[p.tipo];

  const actual = String(formData.get("imagen_url") || "").trim();
  if (actual && !/^https:\/\//i.test(actual)) redirect(`${base}?error=imagen`);
  let nueva = null;
  try {
    nueva = await subirFoto(formData.get("foto"));
  } catch {
    redirect(`${base}?error=foto`);
  }
  const quitar = formData.get("quitar_foto") === "1";
  const imagen = nueva || (quitar ? null : actual) || null;

  const antesFilas = await sql`
    select nombre, categoria, descripcion, precio::float as precio, imagen_url,
           instrucciones, tipo, campo_cliente, vence::text as vence, duracion_dias
    from productos where id = ${id}`;
  const antes = antesFilas[0] || null;

  await sql`
    update productos
    set nombre = ${p.nombre}, categoria = ${p.categoria}, descripcion = ${p.descripcion},
        precio = ${p.precio}, precio_manual = case when proveedor in ('streamzone', 'central_one') and precio is distinct from ${p.precio} then abs(${p.precio} - coalesce(precio_sugerido, 0)) > 0.001 else precio_manual end, imagen_url = ${imagen}, instrucciones = ${p.instrucciones},
        tipo = ${p.tipo},
        tipo_manual = case
          when proveedor is not null and (
            tipo is distinct from ${p.tipo}
            or duracion_dias is distinct from ${p.duracion}
          ) then true
          else tipo_manual
        end,
        campo_cliente = ${p.campoCliente}, vence = ${p.vence}, duracion_dias = ${p.duracion}
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
  redirect(`${base}?aviso=producto_actualizado`);
}


export async function publicarLista(formData) {
  await requireAdmin();

  const ids = formData.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  let volver = String(formData.get("volver") || "/admin/productos");
  if (!volver.startsWith("/admin/productos")) volver = "/admin/productos";

  if (!ids.length || formData.get("confirmo") !== "on") redirect(volver);

  const json = JSON.stringify(ids);

  const r = await sql`
    update productos
    set activo = true
    where id in (select jsonb_array_elements_text(${json}::jsonb)::bigint)
      and not activo
      and precio > 0
      and (proveedor is null or proveedor_disponible = true)
    returning id`;

  if (r.length) {
    await anotar("activar", "producto", r[0].id, "Puso a la venta " + r.length + " producto(s) en bloque");
  }

  revalidatePath("/");
  revalidatePath("/admin/productos");

  redirect(volver + (volver.includes("?") ? "&" : "?") + "publicados=" + r.length);
}
