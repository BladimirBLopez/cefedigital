import Link from "next/link";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import TarjetaProducto from "@/components/TarjetaProducto";
import { iconoCategoria } from "@/lib/iconosCategoria";
import { FiZap, FiShield, FiMessageCircle, FiGrid, FiSearch } from "react-icons/fi";

export const dynamic = "force-dynamic";

function Fila({ titulo, items, verTodos }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-marino">{titulo}</h2>
        {verTodos && <Link href={verTodos} className="shrink-0 text-sm font-semibold text-intenso">Ver todos →</Link>}
      </div>
      <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((p) => (
          <TarjetaProducto key={p.slug} p={p} fila />
        ))}
      </div>
    </section>
  );
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const cat = sp?.cat ? String(sp.cat) : null;
  const q = sp?.q ? String(sp.q).trim().slice(0, 40) : null;
  const POR = 24;
  const pag = Math.max(1, Math.min(500, parseInt(sp?.pag, 10) || 1));
  const catalogo = !!(cat || q || pag > 1 || sp?.todos);
  const aj = await obtenerAjustes();

  const cats = await sql`
    select p.categoria from productos p
    left join categorias c on c.nombre = p.categoria
    where p.activo and p.categoria is not null
    group by p.categoria
    order by min(coalesce(c.orden, 9999)), p.categoria`;

  let lista = [];
  let hayMas = false;
  let destacados = [];
  let novedades = [];
  let porCat = {};

  if (catalogo) {
    const prods = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce((select min(pl.precio) from planes pl where pl.producto_id = p.id and pl.activo), p.precio)::float as precio,
        exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo) as con_planes
      from productos p
      where p.activo and (${cat}::text is null or p.categoria = ${cat})
        and (${q}::text is null or p.nombre ilike '%' || ${q} || '%')
      order by p.id desc
      limit ${POR + 1} offset ${(pag - 1) * POR}`;
    hayMas = prods.length > POR;
    lista = prods.slice(0, POR);
  } else {
    destacados = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce((select min(pl.precio) from planes pl where pl.producto_id = p.id and pl.activo), p.precio)::float as precio,
        exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo) as con_planes
      from productos p where p.activo and p.destacado order by p.id desc limit 8`;
    novedades = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce((select min(pl.precio) from planes pl where pl.producto_id = p.id and pl.activo), p.precio)::float as precio,
        exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo) as con_planes
      from productos p where p.activo order by p.id desc limit 8`;
    const filas = await sql`
      select * from (
        select p.slug, p.nombre, p.categoria, p.imagen_url,
          coalesce((select min(pl.precio) from planes pl where pl.producto_id = p.id and pl.activo), p.precio)::float as precio,
          exists (select 1 from planes pl where pl.producto_id = p.id and pl.activo) as con_planes,
          row_number() over (partition by p.categoria order by p.id desc) as rn
        from productos p where p.activo and p.categoria is not null
      ) t where rn <= 8 order by categoria, rn`;
    for (const f of filas) (porCat[f.categoria] ||= []).push(f);
  }

  const href = (n) => {
    const s = new URLSearchParams();
    if (cat) s.set("cat", cat);
    if (q) s.set("q", q);
    if (!cat && !q) s.set("todos", "1");
    if (n > 1) s.set("pag", String(n));
    return "/?" + s.toString();
  };

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {!catalogo && (
          <>
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marino via-intenso to-electrico p-6 text-white sm:p-10">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cian/25 blur-3xl" />
              <h1 className="relative text-3xl font-extrabold leading-tight sm:text-4xl">Licencias, streaming y recargas</h1>
              <p className="relative mt-2 max-w-md text-sm text-white/85 sm:text-base">Productos digitales con atención personal por WhatsApp.</p>
              <Link href="/?todos=1" className="relative mt-5 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-marino transition hover:bg-neutral-100">Ver catálogo</Link>
            </section>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[[FiZap, "Entrega por WhatsApp"], [FiMessageCircle, "Atención directa"], [FiShield, "Garantía de reemplazo"]].map(([I, t]) => (
                <div key={t} className="rounded-2xl border border-neutral-200 bg-white px-1 py-3 text-[11px] font-medium text-marino">
                  <I className="mx-auto mb-1 h-5 w-5 text-electrico" />{t}
                </div>
              ))}
            </div>
          </>
        )}

        <form method="GET" action="/" className="mt-5 flex gap-2">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input name="q" defaultValue={q || ""} placeholder="Buscar producto" className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-intenso" />
          </div>
          <button className="rounded-xl bg-intenso px-5 text-sm font-semibold text-white transition hover:bg-marino">Buscar</button>
        </form>

        {cats.length > 0 && (
          <nav aria-label="Categorías" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2">
            {[{ categoria: null }, ...cats].map((c) => {
              const activa = c.categoria ? cat === c.categoria : catalogo && !cat && !q;
              const I = c.categoria ? iconoCategoria(c.categoria) : FiGrid;
              return (
                <Link
                  key={c.categoria || "todos"}
                  href={c.categoria ? `/?cat=${encodeURIComponent(c.categoria)}` : "/?todos=1"}
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

        {catalogo ? (
          <>
            <h2 className="mt-5 text-lg font-bold text-marino">{cat || (q ? `Resultados para "${q}"` : "Catálogo completo")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {lista.length === 0 && <p className="col-span-full text-sm text-neutral-500">{q ? "No encontramos productos con ese nombre." : "Pronto habrá productos."}</p>}
              {lista.map((p) => (
                <TarjetaProducto key={p.slug} p={p} />
              ))}
            </div>
            {(pag > 1 || hayMas) && (
              <nav className="mt-6 flex items-center justify-between gap-3 text-sm">
                {pag > 1 ? <Link href={href(pag - 1)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium text-marino hover:border-intenso">← Anterior</Link> : <span />}
                <span className="text-xs text-neutral-500">Página {pag}</span>
                {hayMas ? <Link href={href(pag + 1)} className="rounded-xl bg-intenso px-4 py-2 font-semibold text-white transition hover:bg-marino">Siguiente →</Link> : <span />}
              </nav>
            )}
          </>
        ) : (
          <>
            <Fila titulo="Destacados" items={destacados} />
            <Fila titulo="Novedades" items={novedades} verTodos="/?todos=1" />
            {cats.map((c) => (
              <Fila key={c.categoria} titulo={c.categoria} items={porCat[c.categoria]} verTodos={`/?cat=${encodeURIComponent(c.categoria)}`} />
            ))}
          </>
        )}
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
