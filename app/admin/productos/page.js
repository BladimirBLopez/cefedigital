import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { crearProducto, publicarLista } from "../actions";
import { publicarJuego, ocultarJuego } from "../acciones-juegos";
import Interruptor from "@/components/Interruptor";
import EstrellaDestacado from "@/components/EstrellaDestacado";
import SwitchVenta from "@/components/SwitchVenta";


export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const TIPOS = { clave: "Clave", cuenta: "Cuenta", recarga: "Recarga" };
const ERRORES = {
  nombre: "Falta el nombre",
  precio: "El precio no es válido",
  vence: "La fecha de vencimiento no es válida",
  foto: "No se pudo subir la foto (máx. 4 MB)",
  pedidos: "Ese producto ya tiene pedidos: no se borra para no perder tus ventas. Ocúltalo con el interruptor.",
  borrar: "No se pudo borrar. Intenta otra vez.",
  planes: "Escribe al menos un precio para la cuenta.",
  planesdb: "No se pudieron guardar los planes. No se creó nada, intenta otra vez.",
  repetidas: "Repetiste un plan con la misma modalidad, pantallas y duración. Cambia uno.",
};

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
           count(*) filter (where not activo)::int as oculto
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
    ...categoriasProductos.map((c) => c.categoria)
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

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Productos</h1>
          <Link href="/admin/registro?f=producto" className="text-xs text-marino hover:underline">Ver historial</Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ["Total", stats.total, ""],
            ["A la venta", stats.venta, "text-marino"],
            ["Por vencer", stats.vencen, stats.vencen ? "text-amber-600" : ""],
          ].map(([t, n, c]) => (
            <div key={t} className="rounded-2xl bg-white border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">{t}</p>
              <p className={"text-2xl font-semibold " + c}>{n}</p>
            </div>
          ))}
        </div>

        <Link href="/admin/productos/nuevo" className="mb-5 block rounded-xl bg-intenso hover:bg-marino text-white text-center font-semibold py-3">+ Nuevo producto</Link>
        {["pedidos", "borrar"].includes(sp?.error) && <p className="text-sm text-red-600 mb-3">{ERRORES[sp.error]}</p>}

        <form method="get" className="flex gap-2 mb-3">
          {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
          {prov !== "todos" && <input type="hidden" name="prov" value={prov} />}
          {cats.length > 0 && <input type="hidden" name="cat" value={cats.join("|")} />}
          <input name="q" defaultValue={q} placeholder="Buscar producto o categoría" className={campo + " !py-2"} />
          <button className="rounded-xl bg-marino text-white px-4 text-sm">Buscar</button>
        </form>

        <div className="flex gap-2 overflow-x-auto mb-2">
          {[["todos", "Todos los proveedores"], ["central_one", "Central One"], ["streamzone", "StreamZone"], ["propio", "Propios"]].map(([v, t]) => (
            <Link
              key={v}
              href={hrefProv(v)}
              className={
                "shrink-0 rounded-full px-3 py-1 text-sm border " +
                (prov === v ? "bg-intenso text-white border-intenso" : "bg-white border-neutral-300 text-neutral-600")
              }
            >
              {t}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto mb-4">
          {chips.map(([e, t]) => (
            <Link
              key={e}
              href={href(e)}
              className={
                "shrink-0 rounded-full px-3 py-1 text-sm border " +
                (estado === e ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600")
              }
            >
              {t}
            </Link>
          ))}
        </div>

        {categorias.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-neutral-500 mb-1">Categorías (marca las que quieras ver)</p>
            <div className="flex gap-2 overflow-x-auto">
              <Link
                href={hrefCat(null)}
                className={
                  "shrink-0 rounded-full px-3 py-1 text-sm border " +
                  (cats.length === 0 ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600")
                }
              >
                Todas
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c}
                  href={hrefCat(c)}
                  className={
                    "shrink-0 rounded-full px-3 py-1 text-sm border " +
                    (cats.includes(c) ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600")
                  }
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        )}

        {sp?.publicados != null && (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Se pusieron a la venta {Number(sp.publicados) || 0} producto(s).
          </p>
        )}

        {publicables.length > 0 && (
          <form action={publicarLista} className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 space-y-2">
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
              <li key={g.id} className="rounded-2xl bg-white border border-neutral-200 p-3 space-y-2">
                <p className="font-medium text-marino">{g.nombre}</p>
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
              </li>
            ))}
          </ul>
        )}
        <ul className="space-y-3">
          {!modoJuegos && lista.length === 0 && <li className="text-sm text-neutral-500">No hay productos con ese filtro.</li>}
          {(modoJuegos ? [] : lista).map((p) => {
            const bajo = false;
            const ev = estadoVence(p.vence);
            return (
              <li key={p.id} className="rounded-2xl bg-white border border-neutral-200 p-3 flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center text-neutral-400 text-xs">
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    "Sin foto"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/productos/${p.id}`} className="block font-medium truncate text-marino hover:underline">
                    {p.nombre}
                  </Link>
                  <p className="text-xs text-neutral-500 truncate">
                    {p.categoria || "Sin categoría"} · {TIPOS[p.tipo] || "Clave"}
                  {p.proveedor === "streamzone" && (
                    <span className="block text-[11px] text-neutral-500">
                      StreamZone · Costo Bs {Number(p.costo_proveedor_bs || 0).toFixed(4)} · Sugerido Bs {Number(p.precio_sugerido || 0).toFixed(2)} ·
                      {p.precio_manual ? "Precio manual protegido" : `Margen automático ${Number(p.margen_porcentaje || 20)}%`} ·
                      {p.proveedor_disponible ? `Stock: ${p.stock_proveedor ?? "Disponible"}` : "Sin stock"}
                    </span>
                  )}
{p.proveedor === "central_one" && (
                    <span className="block text-[11px] text-neutral-500">
                      Central One · Costo Bs {Number(p.costo_proveedor_bs_central_one || 0).toFixed(4)} · Sugerido Bs {Number(p.precio_sugerido || 0).toFixed(2)} ·
                      {p.precio_manual ? "Precio manual protegido" : `Margen automático ${Number(p.margen_porcentaje || 20)}%`} ·
                      {p.proveedor_disponible ? `Stock: ${p.stock_proveedor ?? "Disponible"}` : "Sin stock"}
                    </span>
                  )}
                  </p>
                  <p className="text-sm font-semibold">
                    Bs {p.precio.toFixed(2)}{" "}
                    <span className={"text-xs font-normal " + (bajo ? "text-red-600" : "text-neutral-500")}>
                      {p.tipo === "recarga" ? "· Bajo pedido" : "· Entrega por WhatsApp"}
                    </span>
                  </p>
                  {ev.clave !== "sin" && (
                    <span className={"inline-block mt-1 text-xs rounded-full px-2 py-0.5 " + ev.clase}>{ev.texto}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/admin/productos/${p.id}`} className="rounded-full border border-marino px-3 py-1 text-xs font-semibold text-marino hover:bg-marino hover:text-white">Editar</Link>
                  <div className="flex items-center gap-2">
                    <EstrellaDestacado id={p.id} destacado={p.destacado} />
                    <Interruptor id={p.id} activo={p.activo} />
                  </div>
                  
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
