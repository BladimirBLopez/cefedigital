import Link from "next/link";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { optimizar } from "@/lib/imagen";
import { FiZap, FiShield, FiMessageCircle, FiGrid, FiTv, FiMusic, FiCpu, FiCamera, FiBook, FiBookOpen, FiPenTool, FiBriefcase, FiHeart, FiLock } from "react-icons/fi";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const cat = sp?.cat ? String(sp.cat) : null;
  const q = sp?.q ? String(sp.q).trim().slice(0, 40) : null;
  const POR = 24;
  const pag = Math.max(1, Math.min(500, parseInt(sp?.pag, 10) || 1));
  const aj = await obtenerAjustes();
  const cats = await sql`
    select p.categoria from productos p
    left join categorias c on c.nombre = p.categoria
    where p.activo and p.categoria is not null
    group by p.categoria
    order by min(coalesce(c.orden, 9999)), p.categoria`;
  const prods = await sql`
    select p.slug, p.nombre, p.categoria, p.imagen_url,
      coalesce((select min(pl.precio) from planes pl where pl.producto_id = p.id and pl.activo), p.precio)::float as precio,
      exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo) as con_planes
    from productos p
    where p.activo and (${cat}::text is null or p.categoria = ${cat})
      and (${q}::text is null or p.nombre ilike '%' || ${q} || '%')
    order by p.id desc
    limit ${POR + 1} offset ${(pag - 1) * POR}`;
  const hayMas = prods.length > POR;
  const lista = prods.slice(0, POR);
  const icono = (c) => {
    const x = String(c || "").toLowerCase();
    if (x.includes("+18") || x.includes("contenido")) return FiLock;
    if (x.includes("stream") || x.includes("video") && x.includes("entret")) return FiTv;
    if (x.includes("music") || x.includes("músic") || x.includes("audio") && !x.includes("libro")) return FiMusic;
    if (x.includes("inteligencia")) return FiCpu;
    if (x.includes("foto")) return FiCamera;
    if (x.includes("libro")) return FiBookOpen;
    if (x.includes("educ") || x.includes("idioma")) return FiBook;
    if (x.includes("vpn") || x.includes("antivirus") || x.includes("segur")) return FiShield;
    if (x.includes("dise")) return FiPenTool;
    if (x.includes("product") || x.includes("negocio")) return FiBriefcase;
    if (x.includes("bienestar") || x.includes("fitness")) return FiHeart;
    return FiGrid;
  };
  const href = (n) => {
    const s = new URLSearchParams();
    if (cat) s.set("cat", cat);
    if (q) s.set("q", q);
    if (n > 1) s.set("pag", String(n));
    const x = s.toString();
    return "/" + (x ? "?" + x : "");
  };
  const chip = (activo) =>
    "whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border transition " +
    (activo ? "bg-intenso text-white border-intenso" : "border-neutral-300 text-marino");

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-intenso to-electrico p-6 sm:p-8 text-white"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cian/25 blur-2xl" /><h1 className="relative text-2xl sm:text-3xl font-bold">Licencias, streaming y recargas</h1>
        <p className="relative text-sm text-white/90 mt-2">{aj.nombre_tienda}: productos digitales con entrega rápida por WhatsApp.</p><span className="relative inline-block mt-4 rounded-full bg-turquesa text-marino text-xs font-semibold px-3 py-1">Entrega después de confirmar tu pago</span></section>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          {[[FiZap, "Entrega rápida"], [FiMessageCircle, "Por WhatsApp"], [FiShield, "Garantía"]].map(([I, t]) => (
            <div key={t} className="rounded-2xl bg-white border border-neutral-200 py-3 text-xs font-medium text-marino">
              <I className="mx-auto mb-1 h-5 w-5 text-electrico" />{t}
            </div>
          ))}
        </div>

        <form method="GET" action="/" className="mt-5 flex gap-2">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input name="q" defaultValue={q || ""} placeholder="Buscar producto" className="w-full rounded-xl bg-white border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-intenso" />
          <button className="rounded-xl bg-intenso hover:bg-marino text-white text-sm font-semibold px-5 transition">Buscar</button>
        </form>

        {cats.length > 0 && (
          <nav aria-label="Categorías" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2">
            {[{ categoria: null }, ...cats].map((c) => {
              const activa = c.categoria ? cat === c.categoria : !cat;
              const I = c.categoria ? icono(c.categoria) : FiGrid;
              return (
                <Link
                  key={c.categoria || "todos"}
                  href={c.categoria ? `/?cat=${encodeURIComponent(c.categoria)}` : "/"}
                  aria-current={activa ? "true" : undefined}
                  className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <span className={"flex h-14 w-14 items-center justify-center rounded-full border transition " + (activa ? "border-intenso bg-intenso text-white shadow" : "border-neutral-200 bg-white text-marino")}>
                    <I className="h-6 w-6" />
                  </span>
                  <span className={"line-clamp-2 text-[11px] leading-tight " + (activa ? "font-semibold text-intenso" : "text-neutral-600")}>
                    {c.categoria || "Todos"}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          {lista.length === 0 && <p className="col-span-full text-sm text-neutral-500">{q ? "No encontramos productos con ese nombre." : "Pronto habrá productos."}</p>}
          {lista.map((p) => (
            <Link key={p.slug} href={`/producto/${p.slug}`} className="group rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition p-3 flex flex-col">
              {p.imagen_url ? <img src={optimizar(p.imagen_url, 500)} alt={p.nombre} loading="lazy" className="w-full aspect-square object-cover rounded-xl mb-3" /> : (() => { const I = icono(p.categoria); return <div className="w-full aspect-square rounded-xl mb-3 bg-gradient-to-br from-intenso/10 to-turquesa/20 flex items-center justify-center"><I className="h-10 w-10 text-intenso/40" /></div>; })()}
              <span className="self-start rounded-full bg-turquesa/25 text-marino text-[11px] font-medium px-2 py-0.5">{p.categoria || "Digital"}</span>
              <p className="font-medium mt-1">{p.nombre}</p>
              <p className="text-lg font-bold text-intenso mt-auto pt-3">{p.con_planes && <span className="text-xs font-medium text-neutral-500">Desde </span>}Bs {p.precio.toFixed(2)}</p>
              <p className="mt-2 text-xs font-semibold text-intenso group-hover:underline">
                Ver opciones →
              </p>
            </Link>
          ))}
        </div>

        {(pag > 1 || hayMas) && (
          <nav className="mt-6 flex items-center justify-between gap-3 text-sm">
            {pag > 1 ? (
              <Link href={href(pag - 1)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium text-marino hover:border-intenso">← Anterior</Link>
            ) : <span />}
            <span className="text-xs text-neutral-500">Página {pag}</span>
            {hayMas ? (
              <Link href={href(pag + 1)} className="rounded-xl bg-intenso hover:bg-marino px-4 py-2 font-semibold text-white transition">Siguiente →</Link>
            ) : <span />}
          </nav>
        )}
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
