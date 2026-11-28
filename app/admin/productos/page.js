import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { publicarLista } from "../actions";
import { publicarJuego, ocultarJuego } from "../acciones-juegos";
import Interruptor from "@/components/Interruptor";
import EstrellaDestacado from "@/components/EstrellaDestacado";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const TIPOS = { clave: "Clave", cuenta: "Cuenta", recarga: "Recarga" };
const ERRORES = {
  pedidos: "Ese producto ya tiene pedidos: no se borra para no perder tus ventas. Ocúltalo con el interruptor.",
  borrar: "No se pudo borrar. Intenta otra vez.",
};
const PROV = {
  streamzone: { texto: "StreamZone", clase: "bg-sky-100 text-sky-700" },
  central_one: { texto: "Central One", clase: "bg-violet-100 text-violet-700" },
};
const PROPIO = { texto: "Propio", clase: "bg-emerald-100 text-emerald-700" };
const bs = (n) => Number(n || 0).toFixed(2);

export default async function Productos({ searchParams }) {
  await requireAdmin();
  await asegurarEsquema();
  const sp = await searchParams;
  const q = String(sp?.q || "").trim().toLowerCase();
  const estado = ["venta", "oculto", "vencen"].includes(sp?.estado) ? sp.estado : "todos";
  const cats = String(sp?.cat || "").split("|").map((c) => c.trim()).filter(Boolean);
  const prov = ["central_one", "streamzone", "propio"].includes(sp?.prov) ? sp.prov : "todos";

  const POR_PAGINA = 40;
  const pagina = Math.max(1, Number.parseInt(sp?.pag, 10) || 1);
  const patron = q ? "%" + q.replace(/[%_\\]/g, "") + "%" : null;
  const catsJson = JSON.stringify(cats);

  const vencen = (p) => ["vencido", "pronto"].includes(estadoVence(p.vence).clave);

  const [conteo] = await sql`
    select count(*)::int as total,
           count(*) filter (where activo)::int as venta,
           count(*) filter (where not activo)::int as oculto,
           count(*) filter (where proveedor is null)::int as propio,
           count(*) filter (where proveedor = 'streamzone')::int as streamzone,
           count(distinct central_one_family_id) filter (where proveedor = 'central_one')::int as central_one
    from productos`;
  const conVence = await sql`select vence::text as vence from productos where vence is not null`;
  const categoriasProductos = await sql`
    select distinct coalesce(categoria, 'Sin categoría') as categoria from productos`;

  const stats = {
    total: conteo.total,
    venta: conteo.venta,
    oculto: conteo.oculto,
    vencen: conVence.filter(vencen).length,
  };

  const filas = await sql`
    select p.id, p.nombre, p.categoria, p.tipo, p.imagen_url, p.destacado, p.vence::text as vence,
      p.precio::float as precio, p.activo, p.proveedor, p.costo_proveedor_bs::float as costo_proveedor_bs, p.costo_proveedor_bs_central_one::float as costo_proveedor_bs_central_one, p.precio_sugerido::float as precio_sugerido, p.margen_porcentaje::float as margen_porcentaje, p.precio_manual, p.proveedor_disponible, p.stock_proveedor
    from productos p
    where (${patron}::text is null or lower(p.nombre || ' ' || coalesce(p.categoria, '')) like ${patron})
      and (${cats.length}::int = 0 or coalesce(p.categoria, 'Sin categoría') in (select jsonb_array_elements_text(${catsJson}::jsonb)))
      and (${estado} <> 'venta' or p.activo)
      and (${estado} <> 'oculto' or not p.activo)
      and (${estado} <> 'vencen' or p.vence is not null)
      and (${prov} = 'todos' or (${prov} = 'propio' and p.proveedor is null) or p.proveedor = ${prov})
    order by p.id desc
    limit ${estado === "vencen" ? 5000 : POR_PAGINA + 1}
    offset ${estado === "vencen" ? 0 : (pagina - 1) * POR_PAGINA}`;

  const hayMas = estado !== "vencen" && filas.length > POR_PAGINA;
  const lista = estado === "vencen" ? filas.filter(vencen) : filas.slice(0, POR_PAGINA);

  const modoJuegos = prov === "central_one" && !patron && estado !== "vencen" && cats.length === 0;
  let juegosAdmin = [];
  let hayMasJuegos = false;
  const paquetesPorJuego = {};

  if (modoJuegos) {
    const fj = await sql`
      select central_one_family_id as id,
             max(central_one_family_name) as nombre,
             count(*)::int as total,
             count(*) filter (where activo)::int as publicados,
             count(*) filter (where not activo and precio > 0 and proveedor_disponible)::int as publicables,
             (min(precio) filter (where precio > 0))::float as desde
      from productos
      where proveedor = 'central_one' and central_one_family_id is not null
      group by central_one_family_id
      having (${estado} <> 'venta' or count(*) filter (where activo) > 0)
         and (${estado} <> 'oculto' or count(*) filter (where not activo) > 0)
      order by max(central_one_family_name)
      limit ${POR_PAGINA + 1}
      offset ${(pagina - 1) * POR_PAGINA}`;
    hayMasJuegos = fj.length > POR_PAGINA;
    juegosAdmin = fj.slice(0, POR_PAGINA);

    const idsJuegos = JSON.stringify(juegosAdmin.map((g) => String(g.id)));
    const paq = await sql`
      select p.id, p.nombre, p.activo, p.proveedor_disponible,
             p.central_one_family_id as familia,
             coalesce(p.central_one_region, 'General') as region,
             p.precio::float as precio,
             p.costo_proveedor_bs_central_one::float as costo
      from productos p
      where p.proveedor = 'central_one'
        and p.central_one_family_id in (select jsonb_array_elements_text(${idsJuegos}::jsonb))
        and (${estado} <> 'venta' or p.activo)
        and (${estado} <> 'oculto' or not p.activo)
      order by p.central_one_region nulls first, p.precio, p.id
      limit 2000`;
    for (const x of paq) {
      (paquetesPorJuego[x.familia] ||= []).push(x);
    }
  }

  const publicables = modoJuegos ? [] : lista.filter((p) => !p.activo && p.precio > 0 && (!p.proveedor || p.proveedor_disponible));

  const hrefProv = (v) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (estado !== "todos") u.set("estado", estado);
    if (cats.length) u.set("cat", cats.join("|"));
    if (v !== "todos") u.set("prov", v);
    const t = u.toString();
    return "/admin/productos" + (t ? "?" + t : "");
  };
  const hrefPag = (n) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (prov !== "todos") u.set("prov", prov);
    if (estado !== "todos") u.set("estado", estado);
    if (cats.length) u.set("cat", cats.join("|"));
    if (n > 1) u.set("pag", String(n));
    const t = u.toString();
    return "/admin/productos" + (t ? "?" + t : "");
  };
  const href = (e) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (prov !== "todos") u.set("prov", prov);
    if (e !== "todos") u.set("estado", e);
    if (cats.length) u.set("cat", cats.join("|"));
    const s = u.toString();
    return "/admin/productos" + (s ? "?" + s : "");
  };
  const categoriasRegistradas = await sql`
    select nombre as categoria from categorias order by orden, nombre
  `;
  const categorias = [...new Set([
    ...categoriasRegistradas.map((c) => c.categoria),
    ...categoriasProductos.map((c) => c.categoria),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  const hrefCat = (c) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (prov !== "todos") u.set("prov", prov);
    if (estado !== "todos") u.set("estado", estado);
    const nuevas = c === null ? [] : cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    if (nuevas.length) u.set("cat", nuevas.join("|"));
    const t = u.toString();
    return "/admin/productos" + (t ? "?" + t : "");
  };

  const chips = [
    ["todos", "Todos"],
    ["venta", "A la venta"],
    ["vencen", "Por vencer"],
    ["oculto", "Ocultos"],
  ];
  const tabs = [
    ["todos", "Todos", stats.total],
    ["propio", "Propios", conteo.propio],
    ["streamzone", "StreamZone", conteo.streamzone],
    ["central_one", "Central One", conteo.central_one],
  ];
  const pill = (on) =>
    "shrink-0 rounded-full px-3 py-1 text-sm border " +
    (on ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600");

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Productos</h1>
            <Link href="/admin/registro?f=producto" className="text-xs text-marino hover:underline">Ver historial</Link>
          </div>
          <Link href="/admin/productos/nuevo" className="rounded-xl bg-intenso px-4 py-2 text-sm font-semibold text-white hover:bg-marino">+ Nuevo</Link>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            ["Total", stats.total, ""],
            ["A la venta", stats.venta, "text-emerald-600"],
            ["Ocultos", stats.oculto, ""],
            ["Por vencer", stats.vencen, stats.vencen ? "text-amber-600" : ""],
          ].map(([t, n, c]) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white p-2 text-center">
              <p className={"text-lg font-semibold " + c}>{n}</p>
              <p className="text-[10px] text-neutral-500">{t}</p>
            </div>
          ))}
        </div>

        {["pedidos", "borrar"].includes(sp?.error) && (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error]}</p>
        )}

        <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl bg-neutral-100 p-1">
          {tabs.map(([v, t, n]) => (
            <Link
              key={v}
              href={hrefProv(v)}
              className={
                "flex-1 shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-center text-sm font-medium " +
                (prov === v ? "bg-white text-marino shadow-sm" : "text-neutral-500")
              }
            >
              {t} <span className="text-xs opacity-70">{n}</span>
            </Link>
          ))}
        </div>

        <form method="get" className="mb-3 flex gap-2">
          {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
          {prov !== "todos" && <input type="hidden" name="prov" value={prov} />}
          {cats.length > 0 && <input type="hidden" name="cat" value={cats.join("|")} />}
          <input name="q" defaultValue={q} placeholder="Buscar producto o categoría" className={campo + " !py-2"} />
          <button className="rounded-xl bg-marino px-4 text-sm text-white">Buscar</button>
        </form>

        <div className="mb-3 flex gap-2 overflow-x-auto">
          {chips.map(([e, t]) => (
            <Link key={e} href={href(e)} className={pill(estado === e)}>{t}</Link>
          ))}
        </div>

        {categorias.length > 0 && (
          <details className="mb-4 rounded-2xl border border-neutral-200 bg-white" open={cats.length > 0}>
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-neutral-600">
              Categorías{cats.length > 0 ? " (" + cats.length + " marcadas)" : ""}
            </summary>
            <div className="flex flex-wrap gap-2 px-3 pb-3">
              <Link href={hrefCat(null)} className={pill(cats.length === 0)}>Todas</Link>
              {categorias.map((c) => (
                <Link key={c} href={hrefCat(c)} className={pill(cats.includes(c))}>{c}</Link>
              ))}
            </div>
          </details>
        )}

        {sp?.publicados != null && (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Se pusieron a la venta {Number(sp.publicados) || 0} producto(s).
          </p>
        )}

        {publicables.length > 0 && (
          <form action={publicarLista} className="mb-4 space-y-2 rounded-2xl border border-neutral-200 bg-white p-3">
            {publicables.map((p) => <input key={p.id} type="hidden" name="ids" value={p.id} />)}
            <input type="hidden" name="volver" value={hrefPag(pagina)} />
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" name="confirmo" required />
              Confirmo que revisé los precios de esta página
            </label>
            <button className="w-full rounded-xl bg-intenso px-4 py-3 text-sm font-semibold text-white hover:bg-marino">
              Publicar los {publicables.length} de esta página
            </button>
          </form>
        )}

        {modoJuegos && (
          <ul className="space-y-3">
            {juegosAdmin.length === 0 && <li className="text-sm text-neutral-500">No hay juegos con ese filtro.</li>}
            {juegosAdmin.map((g) => (
              <li key={g.id} className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium text-marino">{g.nombre}</p>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">Central One</span>
                </div>
                <p className="text-xs text-neutral-500">
                  {g.total} paquetes · {g.publicados} publicados{g.desde ? " · desde Bs " + g.desde.toFixed(2) : ""}
                </p>
                {g.publicables > 0 && (
                  <form action={publicarJuego} className="space-y-2">
                    <input type="hidden" name="familia_id" value={g.id} />
                    <input type="hidden" name="volver" value={hrefPag(pagina)} />
                    <label className="flex items-center gap-2 text-xs text-neutral-600">
                      <input type="checkbox" name="confirmo" required />
                      Confirmo que revisé los precios de este juego
                    </label>
                    <button className="w-full rounded-xl bg-intenso px-4 py-2 text-sm font-semibold text-white hover:bg-marino">
                      Publicar {g.publicables} paquetes
                    </button>
                  </form>
                )}
                {g.publicados > 0 && (
                  <form action={ocultarJuego}>
                    <input type="hidden" name="familia_id" value={g.id} />
                    <input type="hidden" name="volver" value={hrefPag(pagina)} />
                    <button className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-marino">
                      Ocultar los {g.publicados} publicados
                    </button>
                  </form>
                )}
                <details className="rounded-xl border border-neutral-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-marino">
                    Ver paquetes ({(paquetesPorJuego[g.id] || []).length})
                  </summary>
                  <div className="space-y-1 px-3 pb-3">
                    {Object.entries(
                      (paquetesPorJuego[g.id] || []).reduce((acc, x) => {
                        (acc[x.region] ||= []).push(x);
                        return acc;
                      }, {})
                    ).map(([region, items]) => (
                      <div key={region} className="pt-2">
                        <p className="text-xs font-bold uppercase text-neutral-500">{region} · {items.length}</p>
                        {items.map((x) => (
                          <div key={x.id} className="flex items-center gap-2 border-b border-neutral-100 py-2">
                            <div className="min-w-0 flex-1">
                              <Link href={`/admin/productos/${x.id}`} className="block truncate text-xs font-medium text-marino hover:underline">
                                {x.nombre}
                              </Link>
                              <p className="text-[11px] text-neutral-500">
                                Costo Bs {bs(x.costo)} · Precio Bs {bs(x.precio)}
                                {x.costo > 0 ? " · Gana Bs " + bs(x.precio - x.costo) : ""}
                                {x.proveedor_disponible ? "" : " · Sin stock"}
                              </p>
                            </div>
                            <Interruptor id={x.id} activo={x.activo} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-2">
          {!modoJuegos && lista.length === 0 && <li className="text-sm text-neutral-500">No hay productos con ese filtro.</li>}
          {(modoJuegos ? [] : lista).map((p) => {
            const ev = estadoVence(p.vence);
            const et = PROV[p.proveedor] || PROPIO;
            const costo =
              p.proveedor === "streamzone" ? p.costo_proveedor_bs
              : p.proveedor === "central_one" ? p.costo_proveedor_bs_central_one
              : null;
            const gan = costo > 0 ? p.precio - costo : null;
            const sinStock = p.proveedor && !p.proveedor_disponible;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
                <Link href={`/admin/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-[10px] text-neutral-400">
                    {p.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagen_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                    ) : (
                      "Sin foto"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-marino">{p.nombre}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className={"rounded-full px-1.5 py-0.5 text-[10px] font-medium " + et.clase}>{et.texto}</span>
                      <span className="truncate text-[11px] text-neutral-500">{p.categoria || "Sin categoría"} · {TIPOS[p.tipo] || "Clave"}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold">
                      Bs {bs(p.precio)}
                      {gan !== null && (
                        <span className={"ml-2 text-[11px] font-normal " + (gan >= 0 ? "text-emerald-600" : "text-red-600")}>
                          costo {bs(costo)} · gana {bs(gan)}
                        </span>
                      )}
                    </p>
                    {(sinStock || ev.clave !== "sin" || p.precio_manual) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sinStock && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">Sin stock</span>}
                        {ev.clave !== "sin" && <span className={"rounded-full px-2 py-0.5 text-[10px] " + ev.clase}>{ev.texto}</span>}
                        {p.precio_manual && p.proveedor && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">Precio manual</span>}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <Interruptor id={p.id} activo={p.activo} />
                  <EstrellaDestacado id={p.id} destacado={p.destacado} />
                </div>
              </li>
            );
          })}
        </ul>

        {estado !== "vencen" && (pagina > 1 || hayMas || hayMasJuegos) && (
          <nav className="mt-4 flex items-center justify-between text-sm">
            {pagina > 1 ? <Link href={hrefPag(pagina - 1)} className="text-marino hover:underline">← Anterior</Link> : <span />}
            <span className="text-neutral-500">Página {pagina}</span>
            {hayMas || hayMasJuegos ? <Link href={hrefPag(pagina + 1)} className="text-marino hover:underline">Siguiente →</Link> : <span />}
          </nav>
        )}
      </main>
    </>
  );
}
