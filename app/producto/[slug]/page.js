import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { optimizar } from "@/lib/imagen";
import { FiZap, FiShield } from "react-icons/fi";
import SelectorPlan from "@/components/SelectorPlan";
import AgregarCarrito from "@/components/AgregarCarrito";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [p] = await sql`select nombre, descripcion from productos where slug = ${slug} and activo`;
  if (!p) return { title: "Producto no encontrado" };
  return {
    title: p.nombre,
    description: (p.descripcion || `${p.nombre} con entrega rápida por WhatsApp.`).slice(0, 150),
  };
}

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";

export default async function Producto({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const aj = await obtenerAjustes();
  const [p] = await sql`
    select p.id, p.slug, p.nombre, p.categoria, p.descripcion, p.imagen_url, p.tipo, p.campo_cliente, p.precio::float as precio
    from productos p where p.slug = ${slug} and p.activo`;
  if (!p) notFound();
  const esRecarga = p.tipo === "recarga";
  const max = 5;
  const planes = await sql`select id, perfil, pantallas, meses_pagados, duracion_dias, precio::float as precio, compartida, modalidad from planes where producto_id = ${p.id} and activo order by orden, id`;
  const hayPlanes = planes.length > 0;
  const desde = hayPlanes ? Math.min(...planes.map((x) => x.precio)) : p.precio;
  const grupos = [];
  for (const pl of planes) {
    let g = grupos.find((x) => x.perfil === pl.perfil);
    if (!g) {
      g = { perfil: pl.perfil, items: [] };
      grupos.push(g);
    }
    g.items.push(pl);
  }

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/" className="text-sm font-medium text-marino hover:text-intenso">← Volver a la tienda</Link>
        <div className="mt-4 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          {p.imagen_url ? <img src={optimizar(p.imagen_url, 900)} alt={p.nombre} className="w-full aspect-square sm:aspect-video object-cover rounded-xl mb-4" /> : <div className="w-full h-40 rounded-xl mb-4 bg-gradient-to-br from-intenso/10 to-turquesa/20" />}
          {p.categoria && <span className="inline-block rounded-full bg-turquesa/25 text-marino text-xs font-medium px-2.5 py-0.5">{p.categoria}</span>}
          <h1 className="text-2xl font-bold mt-2">{p.nombre}</h1>
          <p className="text-3xl font-bold text-intenso mt-3">{hayPlanes && <span className="text-base font-medium text-neutral-500">Desde </span>}Bs {desde.toFixed(2)}</p>
          {p.descripcion && <p className="text-sm text-neutral-600 mt-3 whitespace-pre-line">{p.descripcion}</p>}
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1"><FiZap className="h-3.5 w-3.5 text-electrico" />Entrega rápida por WhatsApp</span>
            <span className="inline-flex items-center gap-1"><FiShield className="h-3.5 w-3.5 text-electrico" />Garantía de reemplazo</span>
          </p>
        </div>

        <div data-opciones className="mt-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 space-y-3">
            <h2 className="text-lg font-bold">Elige tu opción</h2>
            <p className="text-xs text-neutral-500">Agrega al carrito y completa tu pedido allí con tu WhatsApp.</p>
            <input type="hidden" name="producto_id" value={p.id} />
            <input type="hidden" name="slug" value={p.slug} />
            {hayPlanes && <SelectorPlan planes={planes} />}
            {esRecarga && p.campo_cliente && (
              <input name="dato_cliente" required maxLength={100} placeholder={p.campo_cliente} className={campo} />
            )}
            {hayPlanes ? (
              <input type="hidden" name="cantidad" value="1" />
            ) : (
            <select name="cantidad" defaultValue="1" className={campo}>
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "unidad" : "unidades"}</option>
              ))}
            </select>
            )}
            {sp?.error === "fallo" && <p className="text-sm text-red-600">No se pudo registrar tu pedido. Intenta nuevamente o contáctanos por WhatsApp.</p>}
            
            {sp?.error === "dato" && <p className="text-sm text-red-600">Falta: {p.campo_cliente || "el dato de tu cuenta"}</p>}
            {sp?.error === "plan" && <p className="text-sm text-red-600">Elige un plan para continuar</p>}
            {sp?.error === "limite" && <p className="text-sm text-red-600">Hiciste muchos pedidos seguidos. Espera un rato o escríbenos por WhatsApp.</p>}
            <AgregarCarrito producto={{ id: Number(p.id), slug: p.slug, nombre: p.nombre, imagen: p.imagen_url, precio: p.precio, esRecarga, campo_cliente: p.campo_cliente }} planes={planes} />
            
        </div>
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
