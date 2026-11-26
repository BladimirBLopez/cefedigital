import Link from "next/link";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import TarjetaProducto from "@/components/TarjetaProducto";
import { iconoCategoria } from "@/lib/iconosCategoria";
import {
  FiZap,
  FiShield,
  FiMessageCircle,
  FiGrid,
  FiSearch,
  FiArrowRight,
  FiStar,
  FiClock,
  FiShoppingBag,
  FiCheckCircle,
  FiLayers
} from "react-icons/fi";

export const dynamic = "force-dynamic";

function Fila({ titulo, items, verTodos, Icono = FiGrid }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-9">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-intenso/10 text-intenso">
            <Icono className="h-5 w-5" />
          </span>
          <h2 className="truncate text-lg font-extrabold tracking-tight text-marino">
            {titulo}
          </h2>
        </div>

        {verTodos && (
          <Link
            href={verTodos}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-intenso hover:underline"
          >
            Ver todos
            <FiArrowRight />
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((p) => (
          <TarjetaProducto key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}

export default async function Home({ searchParams }) {
  await asegurarEsquema();
  const sp = await searchParams;
  const cat = sp?.cat ? String(sp.cat) : null;
  const q = sp?.q ? String(sp.q).trim().slice(0, 40) : null;
  const POR = 24;
  const pag = Math.max(1, Math.min(500, parseInt(sp?.pag, 10) || 1));
  const catalogo = !!(cat || q || pag > 1 || sp?.todos);
  const aj = await obtenerAjustes();

  const cats = await sql`
    select categoria
    from (
      select nombre as categoria, orden
      from categorias
      union all
      select categoria, 9999 as orden
      from productos
      where activo and (proveedor is null or proveedor_disponible = true) and categoria is not null
    ) t
    group by categoria
    order by min(orden), categoria
  `;

  let lista = [];
  let hayMas = false;
  let destacados = [];
  let novedades = [];
  let porCat = {};

  if (catalogo) {
    const prods = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce(
          (select min(pl.precio) from planes pl
           where pl.producto_id = p.id and pl.activo),
          p.precio
        )::float as precio,
        exists (
          select 1 from planes pl
          where pl.producto_id = p.id and pl.activo
        ) as con_planes
      from productos p
      where p.activo and (p.proveedor is null or p.proveedor_disponible = true)
        and (${cat}::text is null or p.categoria = ${cat})
        and (${q}::text is null or p.nombre ilike '%' || ${q} || '%')
      order by p.id desc
      limit ${POR + 1} offset ${(pag - 1) * POR}
    `;

    hayMas = prods.length > POR;
    lista = prods.slice(0, POR);
  } else {
    destacados = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce(
          (select min(pl.precio) from planes pl
           where pl.producto_id = p.id and pl.activo),
          p.precio
        )::float as precio,
        exists (
          select 1 from planes pl
          where pl.producto_id = p.id and pl.activo
        ) as con_planes
      from productos p
      where p.activo and (p.proveedor is null or p.proveedor_disponible = true) and p.destacado
      order by p.id desc
      limit 8
    `;

    novedades = await sql`
      select p.slug, p.nombre, p.categoria, p.imagen_url,
        coalesce(
          (select min(pl.precio) from planes pl
           where pl.producto_id = p.id and pl.activo),
          p.precio
        )::float as precio,
        exists (
          select 1 from planes pl
          where pl.producto_id = p.id and pl.activo
        ) as con_planes
      from productos p
      where p.activo and (p.proveedor is null or p.proveedor_disponible = true)
      order by p.id desc
      limit 8
    `;

    const filas = await sql`
      select * from (
        select p.slug, p.nombre, p.categoria, p.imagen_url,
          coalesce(
            (select min(pl.precio) from planes pl
             where pl.producto_id = p.id and pl.activo),
            p.precio
          )::float as precio,
          exists (
            select 1 from planes pl
            where pl.producto_id = p.id and pl.activo
          ) as con_planes,
          row_number() over (
            partition by p.categoria order by p.id desc
          ) as rn
        from productos p
        where p.activo and (p.proveedor is null or p.proveedor_disponible = true) and p.categoria is not null
      ) t
      where rn <= 8
      order by categoria, rn
    `;

    for (const f of filas) {
      (porCat[f.categoria] ||= []).push(f);
    }
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
      <TiendaHeader
        nombre={aj.nombre_tienda}
        whatsapp={aj.whatsapp}
      />

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:pt-7">

        {!catalogo && (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-marino via-intenso to-electrico px-6 py-9 text-white shadow-xl shadow-intenso/10 sm:px-9 sm:py-11">

              <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cian/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-turquesa/20 blur-3xl" />

              <div className="relative z-10 grid items-center gap-5 sm:grid-cols-[1fr_170px]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white">
                    <FiZap className="text-cian" />
                    TU TIENDA DIGITAL
                  </span>

                  <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                    Todo lo digital,
                    <span className="block text-cian">
                      en un solo lugar.
                    </span>
                  </h1>

                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
                    Streaming, licencias y recargas.
                    Encuentra tus productos favoritos
                    con atención personalizada.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href="/?todos=1"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-marino shadow-lg transition hover:bg-cian"
                    >
                      Explorar productos
                      <FiArrowRight />
                    </Link>

                    <Link
                      href="/garantia"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      <FiShield />
                      Garantía
                    </Link>
                  </div>
                </div>

                <div className="hidden items-center justify-center sm:flex">
                  <div className="relative flex h-40 w-40 rotate-6 flex-col items-center justify-center rounded-3xl border border-white/25 bg-white/15 shadow-2xl backdrop-blur-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-intenso shadow-lg">
                      <FiShoppingBag className="h-9 w-9" />
                    </div>
                    <span className="mt-3 text-sm font-black">
                      CEFE DIGITAL
                    </span>
                    <span className="mt-1 text-[10px] text-white/80">
                      Tu tienda online
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                [FiZap, "Compra fácil"],
                [FiMessageCircle, "Atención directa"],
                [FiShield, "Garantía disponible"]
              ].map(([Icono, texto]) => (
                <div
                  key={texto}
                  className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-neutral-50 px-2 py-4 text-center shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-intenso/10 text-intenso">
                    <Icono className="h-5 w-5" />
                  </span>
                  <span className="mt-2 text-[11px] font-bold leading-tight text-marino sm:text-xs">
                    {texto}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-marino">
              <FiSearch className="text-intenso" />
              Busca lo que necesitas
            </h2>
          </div>

          <form
            method="GET"
            action="/"
            className="flex gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-2 shadow-sm"
          >
            {cat && (
              <input type="hidden" name="cat" value={cat} />
            )}

            <div className="relative min-w-0 flex-1">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                name="q"
                aria-label="Buscar productos"
                defaultValue={q || ""}
                placeholder="Buscar productos..."
                className="w-full rounded-xl border-0 bg-white py-3 pl-9 pr-3 text-sm text-marino shadow-sm outline-none ring-1 ring-neutral-100 focus:ring-2 focus:ring-intenso"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-intenso px-4 text-sm font-bold text-white transition hover:bg-marino sm:px-6"
            >
              Buscar
            </button>
          </form>
        </section>

        {cats.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-marino">
                <FiLayers className="text-intenso" />
                Categorías
              </h2>

              <Link
                href="/?todos=1"
                className="inline-flex items-center gap-1 text-xs font-bold text-intenso"
              >
                Ver catálogo
                <FiArrowRight />
              </Link>
            </div>

            <nav
              aria-label="Categorías"
              className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3"
            >
              {[{ categoria: null }, ...cats].map((c) => {
                const activa = c.categoria
                  ? cat === c.categoria
                  : !cat && !q;

                const Icono = c.categoria
                  ? iconoCategoria(c.categoria)
                  : FiGrid;

                return (
                  <Link
                    key={c.categoria || "todos"}
                    href={
                      c.categoria
                        ? `/?cat=${encodeURIComponent(c.categoria)}`
                        : "/?todos=1"
                    }
                    aria-current={activa ? "page" : undefined}
                    className="group flex w-21 min-w-[78px] shrink-0 flex-col items-center gap-2 text-center"
                  >
                    <span
                      className={
                        "flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm transition " +
                        (activa
                          ? "border-intenso bg-intenso text-white shadow-intenso/20"
                          : "border-neutral-200 bg-white text-intenso group-hover:border-intenso group-hover:bg-intenso/5")
                      }
                    >
                      <Icono className="h-7 w-7" />
                    </span>

                    <span
                      className={
                        "line-clamp-2 max-w-[80px] text-[11px] leading-tight " +
                        (activa
                          ? "font-extrabold text-intenso"
                          : "font-semibold text-neutral-600")
                      }
                    >
                      {c.categoria || "Todos"}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </section>
        )}

        {catalogo ? (
          <section className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-intenso">
                  Cefe Digital
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-marino">
                  {q
                    ? `Resultados para "${q}"`
                    : cat || "Catálogo completo"}
                </h2>

                {cat && q && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Categoría: {cat}
                  </p>
                )}
              </div>

              <Link
                href="/"
                className="shrink-0 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-marino"
              >
                Inicio
              </Link>
            </div>

            {lista.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center">
                <FiSearch className="mx-auto h-9 w-9 text-neutral-400" />
                <h3 className="mt-3 font-bold text-marino">
                  No encontramos productos
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Prueba con otra búsqueda o explora el catálogo.
                </p>
                <Link
                  href="/?todos=1"
                  className="mt-4 inline-flex rounded-xl bg-intenso px-5 py-3 text-sm font-bold text-white"
                >
                  Ver todos los productos
                </Link>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {lista.map((p) => (
                  <TarjetaProducto key={p.slug} p={p} />
                ))}
              </div>
            )}

            {(pag > 1 || hayMas) && (
              <nav className="mt-7 flex items-center justify-between gap-3 text-sm">
                {pag > 1 ? (
                  <Link
                    href={href(pag - 1)}
                    className="rounded-xl border border-neutral-200 px-4 py-3 font-semibold text-marino"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}

                <span className="text-xs font-semibold text-neutral-500">
                  Página {pag}
                </span>

                {hayMas ? (
                  <Link
                    href={href(pag + 1)}
                    className="rounded-xl bg-intenso px-4 py-3 font-semibold text-white"
                  >
                    Siguiente →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        ) : (
          <>
            <Fila
              titulo="Productos destacados"
              items={destacados}
              verTodos="/?todos=1"
              Icono={FiStar}
            />

            <Fila
              titulo="Recién agregados"
              items={novedades}
              verTodos="/?todos=1"
              Icono={FiClock}
            />

            {cats.map((c) => (
              <Fila
                key={c.categoria}
                titulo={c.categoria}
                items={porCat[c.categoria]}
                verTodos={`/?cat=${encodeURIComponent(c.categoria)}`}
                Icono={iconoCategoria(c.categoria)}
              />
            ))}

            <section className="mt-10 rounded-3xl border border-intenso/10 bg-gradient-to-r from-intenso/5 to-cian/10 p-6 text-center">
              <FiCheckCircle className="mx-auto h-9 w-9 text-intenso" />

              <h2 className="mt-3 text-lg font-extrabold text-marino">
                Compra con tranquilidad
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
                Consulta las condiciones de garantía
                y recibe atención personalizada.
              </p>

              <Link
                href="/garantia"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-intenso px-5 py-3 text-sm font-bold text-white"
              >
                Conocer la garantía
                <FiArrowRight />
              </Link>
            </section>
          </>
        )}
      </main>

      <TiendaFooter
        nombre={aj.nombre_tienda}
        whatsapp={aj.whatsapp}
      />
    </>
  );
}
