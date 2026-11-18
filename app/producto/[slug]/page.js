import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { FiZap, FiShield, FiMessageCircle } from "react-icons/fi";
import { crearPedido } from "@/app/tienda-actions";
import SelectorPlanes from "@/components/SelectorPlanes";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";

export default async function Producto({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const aj = await obtenerAjustes();
  const [p] = await sql`
    select p.id, p.slug, p.nombre, p.categoria, p.descripcion, p.imagen_url, p.tipo, p.campo_cliente, p.precio::float as precio,
      99 as disponibles
    from productos p where p.slug = ${slug} and p.activo`;
  if (!p) notFound();
  const esRecarga = p.tipo === "recarga";
  const max = 5;
  const planes = await sql`select id, perfil, meses_pagados, meses_gratis, precio::float as precio from planes where producto_id = ${p.id} and activo order by orden, id`;
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
          {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full max-h-72 object-cover rounded-xl mb-4" /> : <div className="w-full h-40 rounded-xl mb-4 bg-gradient-to-br from-intenso/10 to-turquesa/20" />}
          {p.categoria && <span className="inline-block rounded-full bg-turquesa/25 text-marino text-xs font-medium px-2.5 py-0.5">{p.categoria}</span>}
          <h1 className="text-2xl font-bold mt-2">{p.nombre}</h1>
          <p className="text-3xl font-bold text-intenso mt-3">{hayPlanes && <span className="text-base font-medium text-neutral-500">Desde </span>}Bs {desde.toFixed(2)}</p>
          {p.descripcion && <p className="text-sm text-neutral-600 mt-3 whitespace-pre-line">{p.descripcion}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-marino">{[[FiZap, "Entrega rápida"], [FiMessageCircle, "Por WhatsApp"], [FiShield, "Garantía"]].map(([I, t]) => (<div key={t} className="rounded-xl bg-neutral-50 border border-neutral-200 py-2"><I className="mx-auto mb-1 h-4 w-4 text-electrico" />{t}</div>))}</div>
          <p className="text-xs text-neutral-500 mt-3">Entrega después de confirmar tu pago</p>
        </div>

        {max === 0 ? (
          <p className="mt-6 text-center text-neutral-400">Producto agotado por ahora.</p>
        ) : (
          <form action={crearPedido} className="mt-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 space-y-3">
            <h2 className="text-lg font-bold">Hacer mi pedido</h2>
            <p className="text-xs text-neutral-500">Llena tus datos y te escribimos por WhatsApp cuando confirmemos tu pago.</p>
            <input type="hidden" name="producto_id" value={p.id} />
            <input type="hidden" name="slug" value={p.slug} />
            {hayPlanes && <SelectorPlanes grupos={grupos} />}
            <input name="nombre" required maxLength={80} placeholder="Tu nombre" className={campo} />
            <input name="whatsapp" required inputMode="tel" placeholder="Tu WhatsApp (ej: 71234567)" className={campo} />
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
            {sp?.error === "datos" && <p className="text-sm text-red-600">Revisa tu nombre y tu número de WhatsApp</p>}
            {sp?.error === "dato" && <p className="text-sm text-red-600">Falta: {p.campo_cliente || "el dato de tu cuenta"}</p>}
            {sp?.error === "plan" && <p className="text-sm text-red-600">Elige un plan para continuar</p>}
            {sp?.error === "stock" && <p className="text-sm text-red-600">No alcanza el stock para esa cantidad</p>}
            {sp?.error === "limite" && <p className="text-sm text-red-600">Hiciste muchos pedidos seguidos. Espera un rato o escríbenos por WhatsApp.</p>}
            <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3 transition">Pedir ahora</button>
          </form>
        )}
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
