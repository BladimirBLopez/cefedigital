import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import SelectorCategoria from "@/components/SelectorCategoria";
import Interruptor from "@/components/Interruptor";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { editarProducto } from "../../actions";
import BorrarSiLibre from "@/components/BorrarSiLibre";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const tarjeta = "rounded-2xl bg-white border border-neutral-200 p-4 space-y-3";
const rotulo = "block text-xs font-medium text-neutral-500";
const titulo = "text-sm font-semibold text-marino";

const TIPOS = { clave: "Clave o licencia", cuenta: "Cuenta con planes", recarga: "Recarga con ID" };
const PROVEEDORES = {
  streamzone: { texto: "StreamZone", clase: "bg-sky-100 text-sky-700" },
  central_one: { texto: "Central One", clase: "bg-violet-100 text-violet-700" },
};
const PROPIO = { texto: "Propio", clase: "bg-emerald-100 text-emerald-700" };

const ERRORES = {
  nombre: "Falta el nombre",
  precio: "El precio no es válido",
  vence: "La fecha de vencimiento no es válida",
  duracion: "La duración debe ser un número de días (1 o más)",
  foto: "No se pudo subir la foto (máx. 4 MB)",
  imagen: "La imagen debe empezar con https://",
};

const bs = (n) => "Bs " + Number(n || 0).toFixed(2);

function Kpi({ t, v, s }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-center">
      <p className="text-[11px] text-neutral-500">{t}</p>
      <p className="mt-0.5 text-sm font-semibold text-marino">{v}</p>
      {s ? <p className="text-[10px] text-neutral-500">{s}</p> : null}
    </div>
  );
}

function Dato({ k, v }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-neutral-500">{k}</dt>
      <dd className="truncate font-medium text-neutral-800">{v}</dd>
    </div>
  );
}

export default async function EditarProducto({ params, searchParams }) {
  await requireAdmin();
  await asegurarEsquema();
  const { id: idTxt } = await params;
  const sp = await searchParams;
  const id = Number(idTxt);
  if (!Number.isInteger(id)) notFound();
  const r = await sql`
    select id, nombre, categoria, descripcion, precio::float as precio, imagen_url,
           instrucciones, tipo, tipo_manual, campo_cliente, vence::text as vence, duracion_dias, activo, proveedor, proveedor_codigo,
           costo_proveedor_cop::float as costo_proveedor_cop, costo_proveedor_bs::float as costo_proveedor_bs,
           costo_proveedor_usd::float as costo_proveedor_usd, costo_proveedor_bs_central_one::float as costo_proveedor_bs_central_one,
           tipo_cambio_cop_bs::float as tipo_cambio_cop_bs, margen_porcentaje::float as margen_porcentaje,
           precio_sugerido::float as precio_sugerido, precio_manual, proveedor_disponible, stock_proveedor,
           central_one_region, central_one_family_name, central_one_requires_target,
           to_char(sincronizado_proveedor_en at time zone 'America/La_Paz', 'DD/MM/YYYY HH24:MI') as sync
    from productos where id = ${id}`;
  const p = r[0];
  if (!p) notFound();
  const ev = estadoVence(p.vence);
  const planes =
    p.tipo === "cuenta"
      ? await sql`select id, nombre, precio::float as precio, costo::float as costo, activo from planes where producto_id = ${id} order by orden, id`
      : [];

  const cats = await sql`
    select categoria from (
      select nombre as categoria, orden from categorias
      union all
      select categoria, 9999 from productos where categoria is not null
    ) t group by categoria order by min(orden), categoria`;

  const etiqueta = PROVEEDORES[p.proveedor] || PROPIO;
  const volver = "/admin/productos?prov=" + (PROVEEDORES[p.proveedor] ? p.proveedor : "propio");
  const costo =
    p.proveedor === "streamzone" ? p.costo_proveedor_bs
    : p.proveedor === "central_one" ? p.costo_proveedor_bs_central_one
    : null;
  const ganancia = costo > 0 ? p.precio - costo : null;
  const sobreCosto = costo > 0 ? Math.round((ganancia / costo) * 100) : null;
  const stockTxt = p.proveedor_disponible ? String(p.stock_proveedor ?? "Disponible") : "Sin stock";

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href={volver} className="text-xs text-marino hover:underline">← Productos · {etiqueta.texto}</Link>

        <div className="mt-2 mb-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
          {p.imagen_url ? (
            <img src={p.imagen_url} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100 object-cover" />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{p.nombre}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + etiqueta.clase}>{etiqueta.texto}</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">{TIPOS[p.tipo] || p.tipo}</span>
              {ev.clave !== "sin" && (
                <span className={"rounded-full px-2 py-0.5 text-[11px] " + ev.clase}>{ev.texto}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-center">
            <Interruptor id={p.id} activo={p.activo} />
            <p className="mt-1 text-[10px] text-neutral-500">{p.activo ? "A la venta" : "Oculto"}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Kpi t={planes.length > 0 ? "Desde" : "Precio"} v={bs(p.precio)} />
          <Kpi t="Costo" v={costo > 0 ? bs(costo) : "—"} />
          <Kpi t="Ganancia" v={ganancia !== null ? bs(ganancia) : "—"} s={sobreCosto !== null ? sobreCosto + "% sobre costo" : ""} />
        </div>

        {ERRORES[sp?.error] && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error]}</p>
        )}

        {p.proveedor && (
          <section className={tarjeta + " mb-4"}>
            <h2 className={titulo}>Datos del proveedor · {etiqueta.texto}</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Dato k="Código" v={p.proveedor_codigo || "—"} />
              <Dato k="Disponibilidad" v={stockTxt} />
              {p.proveedor === "streamzone" && (
                <>
                  <Dato k="Costo COP" v={Number(p.costo_proveedor_cop || 0).toFixed(2)} />
                  <Dato k="Costo Bs" v={Number(p.costo_proveedor_bs || 0).toFixed(4)} />
                </>
              )}
              {p.proveedor === "central_one" && (
                <>
                  <Dato k="Juego" v={p.central_one_family_name || "—"} />
                  <Dato k="Región" v={p.central_one_region || "General"} />
                  <Dato k="Costo USD" v={Number(p.costo_proveedor_usd || 0).toFixed(4)} />
                  <Dato k="Costo Bs" v={Number(p.costo_proveedor_bs_central_one || 0).toFixed(4)} />
                  <Dato k="Pide datos del jugador" v={p.central_one_requires_target ? "Sí" : "No"} />
                </>
              )}
              <Dato k="Precio sugerido" v={bs(p.precio_sugerido)} />
              <Dato k="Precio" v={p.precio_manual ? "Manual protegido" : "Automático " + Number(p.margen_porcentaje || 20) + "%"} />
              <Dato k="Última sincronización" v={p.sync || "—"} />
            </dl>
          </section>
        )}

        <form action={editarProducto} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="imagen_url" value={p.imagen_url || ""} />

          <section className={tarjeta}>
            <h2 className={titulo}>1. Foto y nombre</h2>
            <SubirFoto actual={p.imagen_url || ""} />
            <label className={rotulo}>
              Nombre
              <input name="nombre" required defaultValue={p.nombre} className={campo + " mt-1"} />
            </label>
          </section>

          <section className={tarjeta}>
            <h2 className={titulo}>2. Tipo y precios</h2>
            <CamposProducto tipo={p.tipo} campoCliente={p.campo_cliente} duracion={p.duracion_dias} sinDuracion={planes.length > 0} />
            {p.proveedor === "streamzone" && (
              <p className="text-xs text-neutral-500">
                Clasificación: {p.tipo_manual ? "manual protegida" : "automática según duración del proveedor"}.
                Si cambias el tipo o la duración y guardas, se conservarán en futuras sincronizaciones.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={rotulo}>
                {planes.length > 0 ? "Precio desde (Bs)" : "Precio de venta (Bs)"}
                <input name="precio" required inputMode="decimal" defaultValue={p.precio} readOnly={planes.length > 0} className={campo + " mt-1" + (planes.length > 0 ? " opacity-60" : "")} />
                {p.proveedor && (
                  <span className="mt-1 block text-[11px] leading-5 text-neutral-500">
                    Para volver al precio automático, pon el precio sugerido ({bs(p.precio_sugerido)}) y guarda.
                  </span>
                )}
              </label>
              <label className={rotulo}>
                Vence (proveedor)
                <input name="vence" type="date" defaultValue={p.vence || ""} className={campo + " mt-1"} />
              </label>
            </div>
          </section>

          <section className={tarjeta}>
            <h2 className={titulo}>3. Detalles</h2>
            <SelectorCategoria categorias={cats.map((c) => c.categoria)} actual={p.categoria || ""} />
            <label className={rotulo}>
              Descripción
              <textarea name="descripcion" rows={2} defaultValue={p.descripcion || ""} className={campo + " mt-1"} />
            </label>
            <label className={rotulo}>
              Instrucciones de activación
              <textarea name="instrucciones" rows={4} defaultValue={p.instrucciones || ""} className={campo + " mt-1"} />
            </label>
          </section>

          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Link href={volver} className="rounded-xl border border-neutral-300 px-5 py-3 text-center font-semibold text-neutral-600">Volver</Link>
            <button className="flex-1 rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar cambios</button>
          </div>
        </form>

        {planes.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white border border-neutral-200 p-4">
            <h2 className="text-sm font-semibold mb-2">Planes registrados</h2>
            <ul className="divide-y divide-neutral-100">
              {planes.map((pl) => (
                <li key={pl.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className={"min-w-0 truncate " + (pl.activo ? "" : "text-neutral-400")}>{pl.nombre}{pl.activo ? "" : " · Oculto"}</span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold">Bs {pl.precio.toFixed(2)}</span>
                    {pl.costo > 0 && <span className="block text-xs text-neutral-500">Te cuesta Bs {pl.costo.toFixed(2)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {p.tipo === "cuenta" && (
          <Link href={`/admin/productos/${p.id}/planes`} className="mt-4 block rounded-2xl bg-white border border-esmeralda p-4 text-center font-semibold text-marino hover:bg-esmeralda/10">
            Editar planes y precios →
          </Link>
        )}
        <div className="mt-6 flex justify-end">
          <BorrarSiLibre id={p.id} nombre={p.nombre} />
        </div>
      </main>
    </>
  );
}
