import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import SelectorCategoria from "@/components/SelectorCategoria";
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

const ERRORES = {
  nombre: "Falta el nombre",
  precio: "El precio no es válido",
  vence: "La fecha de vencimiento no es válida",
  duracion: "La duración debe ser un número de días (1 o más)",
  foto: "No se pudo subir la foto (máx. 4 MB)",
  imagen: "La imagen debe empezar con https://",
};

export default async function EditarProducto({ params, searchParams }) {
  await requireAdmin();
  await asegurarEsquema();
  const { id: idTxt } = await params;
  const sp = await searchParams;
  const id = Number(idTxt);
  if (!Number.isInteger(id)) notFound();
  const r = await sql`
    select id, nombre, categoria, descripcion, precio::float as precio, imagen_url,
           instrucciones, tipo, campo_cliente, vence::text as vence, duracion_dias, activo
    from productos where id = ${id}`;
  const p = r[0];
  if (!p) notFound();
  const ev = estadoVence(p.vence);
  const planes =
    p.tipo === "cuenta"
      ? await sql`select id, nombre, precio::float as precio, costo::float as costo, activo from planes where producto_id = ${id} order by orden, id`
      : [];

  const cats = await sql`select distinct categoria from productos where categoria is not null order by 1`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/admin/productos" className="text-xs text-marino hover:underline">← Productos</Link>
        <div className="flex items-start justify-between gap-2 mt-2 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{p.nombre}</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {p.activo ? "A la venta" : "Oculto"} · {TIPOS[p.tipo] || p.tipo}
            </p>
          </div>
          {ev.clave !== "sin" && (
            <span className={"shrink-0 text-xs rounded-full px-2 py-0.5 " + ev.clase}>{ev.texto}</span>
          )}
        </div>

        {ERRORES[sp?.error] && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error]}</p>
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
            <div className="grid grid-cols-2 gap-3">
              <label className={rotulo}>
                {planes.length > 0 ? "Precio desde (Bs)" : "Precio (Bs)"}
                <input name="precio" required inputMode="decimal" defaultValue={p.precio} readOnly={planes.length > 0} className={campo + " mt-1" + (planes.length > 0 ? " opacity-60" : "")} />
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
            <Link href="/admin/productos" className="rounded-xl border border-neutral-300 px-5 py-3 text-center font-semibold text-neutral-600">Volver</Link>
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
