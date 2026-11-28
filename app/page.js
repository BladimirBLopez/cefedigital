import Link from "next/link";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerAjustes, limpiarWhatsapp } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import TarjetaProducto from "@/components/TarjetaProducto";
import TarjetaJuego from "@/components/TarjetaJuego";
import { iconoCategoria } from "@/lib/iconosCategoria";
import { GRUPOS, grupoDe, gruposConProductos } from "@/lib/categorias-tienda";
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
  FiCreditCard,
  FiLayers
} from "react-icons/fi";

export const dynamic = "force-dynamic";

async function traerProductos({ nombres = null, q = null, soloDestacados = false, orden = "recientes", limite = 8, offset = 0 }) {
  return await sql`
    select * from (
      select p.slug, p.nombre, p.categoria, p.imagen_url, p.tipo, p.campo_cliente, p.id,
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
        and p.proveedor is distinct from 'central_one'
        and (${nombres}::text[] is null or p.categoria = any(${nombres}::text[]))
        and (${q}::text is null or p.nombre ilike '%' || ${q} || '%')
        and (${soloDestacados}::boolean is not true or p.destacado)
    ) t
    order by
      case when ${orden}::text = 'precio_asc' then precio end asc nulls last,
      case when ${orden}::text = 'precio_desc' then precio end desc nulls last,
      case when ${orden}::text = 'nombre' then lower(nombre) end asc,
      id desc
    limit ${limite} offset ${offset}
  `;
}

async function contarProductos({ nombres = null, q = null }) {
  const [r] = await sql`
    select count(*)::int as n
    from productos p
    where p.activo and (p.proveedor is null or p.proveedor_disponible = true)
      and p.proveedor is distinct from 'central_one'
      and (${nombres}::text[] is null or p.categoria = any(${nombres}::text[]))
      and (${q}::text is null or p.nombre ilike '%' || ${q} || '%')
  `;
  return r ? r.n : 0;
}

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

function FilaJuegos({ juegos }) {
  if (!juegos || juegos.length === 0) return null;

  return (
    <section className="mt-9">
      <h2 className="text-lg font-extrabold tracking-tight text-marino">
        Recargas de juegos{juegos.length === 24 && (<Link href="/?juegos=1" className="ml-3 text-xs font-bold text-intenso">Ver todos →</Link>)}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {juegos.map((j) => (
          <TarjetaJuego key={j.id} j={j} />
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
  const verJuegos = !!sp?.juegos;
    const orden = ["precio_asc", "precio_desc", "nombre"].includes(sp?.orden) ? sp.orden : "recientes";
    const catalogo = !!(cat || q || pag > 1 || sp?.todos || verJuegos);
  const aj = await obtenerAjustes();

  const conteo = await sql`
      select categoria, nombre
      from productos
      where activo and (proveedor is null or proveedor_disponible = true)
        and proveedor is distinct from 'central_one' and categoria is not null
    `;
    const cats = gruposConProductos(conteo);
    const esGrupo = !!cat && GRUPOS.includes(cat);
    const nombresCat = cat && !esGrupo ? [cat] : null;

    let lista = [];
    let total = 0;
    let paginas = 1;
  let hayMas = false;
  let destacados = [];
  let novedades = [];
  let porCat = {};
  let juegos = [];

  if (catalogo) {
      let prods = [];
      if (!verJuegos && esGrupo) {
        const todos = (await traerProductos({ q, orden, limite: 1000 }))
          .filter((r) => grupoDe(r.categoria, r.nombre) === cat);
        total = todos.length;
        prods = todos.slice((pag - 1) * POR, pag * POR + 1);
      } else if (!verJuegos) {
        prods = await traerProductos({ nombres: nombresCat, q, orden, limite: POR + 1, offset: (pag - 1) * POR });
      }
      hayMas = prods.length > POR;
      lista = prods.slice(0, POR);
      if (!verJuegos && !esGrupo) total = await contarProductos({ nombres: nombresCat, q });
      paginas = Math.max(pag, Math.ceil(total / POR));
    } else {
      destacados = await traerProductos({ soloDestacados: true, limite: 8 });
      const vistos = new Set(destacados.map((p) => p.slug));

      const recientes = await traerProductos({ limite: 24 });
      novedades = recientes.filter((p) => !vistos.has(p.slug)).slice(0, 8);
      novedades.forEach((p) => vistos.add(p.slug));

      const filas = await traerProductos({ limite: 300 });
      for (const f of filas) {
        if (vistos.has(f.slug) || !f.categoria) continue;
        const g = grupoDe(f.categoria, f.nombre);
        if (!g) continue;
        const arr = (porCat[g] ||= []);
        if (arr.length < 8) arr.push(f);
      }
    }

    if (!cat && pag === 1) {
    juegos = await sql`
      select central_one_family_id as id,
             max(central_one_family_name) as nombre,
             mode() within group (order by central_one_category) as categoria,
             (min(precio) filter (where precio > 0))::float as precio,
             count(*)::int as paquetes,
             (select imagen_url from juegos_imagen ji
              where ji.familia_id = productos.central_one_family_id) as imagen
      from productos
      where proveedor = 'central_one' and activo and proveedor_disponible = true
        and central_one_family_id is not null
        and (${q}::text is null or central_one_family_name ilike '%' || ${q} || '%')
      group by central_one_family_id
      order by count(*) desc
      limit ${verJuegos ? 500 : 24}
    `;
  }

  const href = (n, o = orden) => {
    const s = new URLSearchParams();
    if (cat) s.set("cat", cat);
    if (q) s.set("q", q);
    if (!cat && !q) s.set("todos", "1");
    if (o !== "recientes") s.set("orden", o);
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
                [FiCreditCard, "Pago por QR"],
                [FiClock, "Atención 24/7"],
                [FiShield, "Garantía 7 días"]
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

        {!catalogo && (
          <section className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <h2 className="text-sm font-extrabold text-marino">Cómo comprar</h2>
            <ol className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold leading-tight text-marino sm:text-xs">
              {["Elige tu producto", "Paga por QR", "Recibe por WhatsApp"].map((t, i) => (
                <li key={t} className="flex flex-col items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-intenso text-sm font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </section>
        )}

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
                    : verJuegos ? "Recargas de juegos" : cat || "Catálogo completo"}
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

            {juegos.length > 0 && <FilaJuegos juegos={juegos} />}
            {!verJuegos && lista.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-500">
                    {total} {total === 1 ? "producto" : "productos"}
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {[["recientes", "Recientes"], ["precio_asc", "Menor precio"], ["precio_desc", "Mayor precio"], ["nombre", "A-Z"]].map(([v, t]) => (
                      <Link
                        key={v}
                        href={href(1, v)}
                        className={"shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold " + (orden === v ? "border-intenso bg-intenso text-white" : "border-neutral-200 text-marino")}
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {lista.length === 0 && juegos.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center">
                <FiSearch className="mx-auto h-9 w-9 text-neutral-400" />
                <h3 className="mt-3 font-bold text-marino">
                  No encontramos productos
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Prueba con otra búsqueda o explora una categoría.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {cats.map((c) => (
                      <Link key={c.categoria} href={`/?cat=${encodeURIComponent(c.categoria)}`} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-marino">
                        {c.categoria}
                      </Link>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    ¿No encuentras lo que buscas?{" "}
                    {limpiarWhatsapp(aj.whatsapp) && (
                      <a href={`https://wa.me/${limpiarWhatsapp(aj.whatsapp)}`} className="font-bold text-intenso">Escríbenos por WhatsApp</a>
                    )}
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
                  Página {pag} de {paginas}
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
            <FilaJuegos juegos={juegos} />

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
