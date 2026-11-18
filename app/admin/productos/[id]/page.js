import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { editarProducto } from "../../actions";
import BorrarProducto from "@/components/BorrarProducto";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const tarjeta = "rounded-2xl bg-white border border-neutral-200 p-4 space-y-3";
const rotulo = "block text-xs font-medium text-neutral-500";

const TIPOS = { clave: "Clave o licencia", cuenta: "Cuenta de streaming", recarga: "Recarga de juego" };

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
        {sp?.ok && (
          <p className="mb-4 rounded-xl border border-esmeralda bg-esmeralda/10 px-4 py-3 text-sm text-marino">Cambios guardados</p>
        )}

        <form action={editarProducto} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="imagen_url" value={p.imagen_url || ""} />

          <section className={tarjeta}>
            <SubirFoto actual={p.imagen_url || ""} />
            <label className={rotulo}>
              Nombre
              <input name="nombre" required defaultValue={p.nombre} className={campo + " mt-1"} />
            </label>
            <label className={rotulo}>
              Categoría
              <input name="categoria" defaultValue={p.categoria || ""} placeholder="Ej: Streaming" className={campo + " mt-1"} />
            </label>
          </section>

          <section className={tarjeta}>
            <CamposProducto tipo={p.tipo} campoCliente={p.campo_cliente} duracion={p.duracion_dias} />
            <div className="grid grid-cols-2 gap-3">
              <label className={rotulo}>
                Precio (Bs)
                <input name="precio" required inputMode="decimal" defaultValue={p.precio} className={campo + " mt-1"} />
              </label>
              <label className={rotulo}>
                Vence (proveedor)
                <input name="vence" type="date" defaultValue={p.vence || ""} className={campo + " mt-1"} />
              </label>
            </div>
          </section>

          <section className={tarjeta}>
            <label className={rotulo}>
              Descripción
              <textarea name="descripcion" rows={2} defaultValue={p.descripcion || ""} className={campo + " mt-1"} />
            </label>
            <label className={rotulo}>
              Instrucciones de activación
              <textarea name="instrucciones" rows={4} defaultValue={p.instrucciones || ""} className={campo + " mt-1"} />
            </label>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
            <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar cambios</button>
          </div>
        </form>

        {p.tipo === "cuenta" && (
          <Link href={`/admin/productos/${p.id}/planes`} className="mt-4 block rounded-2xl bg-white border border-esmeralda p-4 text-center font-semibold text-marino hover:bg-esmeralda/10">
            Planes y precios →
          </Link>
        )}
        <div className="mt-6 flex justify-end">
          <BorrarProducto id={p.id} nombre={p.nombre} />
        </div>
      </main>
    </>
  );
}
