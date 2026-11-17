import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { editarProducto } from "../../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
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
        <div className="flex items-center justify-between gap-2 mt-2 mb-4">
          <h1 className="text-xl font-semibold truncate">{p.nombre}</h1>
          {ev.clave !== "sin" && (
            <span className={"shrink-0 text-xs rounded-full px-2 py-0.5 " + ev.clase}>{ev.texto}</span>
          )}
        </div>

        <form action={editarProducto} className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="imagen_url" value={p.imagen_url || ""} />
          <SubirFoto actual={p.imagen_url || ""} />
          <input name="nombre" required defaultValue={p.nombre} placeholder="Nombre" className={campo} />
          <input name="categoria" defaultValue={p.categoria || ""} placeholder="Categoría" className={campo} />
          <select name="tipo" defaultValue={p.tipo || "clave"} className={campo}>
            <option value="clave">Clave / licencia</option>
            <option value="cuenta">Cuenta</option>
            <option value="recarga">Recarga (ID del cliente)</option>
          </select>
          <input
            name="campo_cliente"
            defaultValue={p.campo_cliente || ""}
            placeholder="Solo recargas: qué pedir al cliente"
            className={campo}
          />
          <input name="precio" required inputMode="decimal" defaultValue={p.precio} placeholder="Precio en Bs" className={campo} />
          <label className="block text-xs text-neutral-500">
            Fecha de vencimiento (vacío = no vence)
            <input name="vence" type="date" defaultValue={p.vence || ""} className={campo + " mt-1"} />
          </label>
          <label className="block text-xs text-neutral-500">
            Duración del servicio en días (ej: 30; vacío = no avisa)
            <input name="duracion_dias" inputMode="numeric" defaultValue={p.duracion_dias || ""} className={campo + " mt-1"} />
          </label>
          <textarea name="descripcion" rows={2} defaultValue={p.descripcion || ""} placeholder="Descripción" className={campo} />
          <textarea
            name="instrucciones"
            rows={4}
            defaultValue={p.instrucciones || ""}
            placeholder="Instrucciones de activación para el cliente"
            className={campo}
          />
          {ERRORES[sp?.error] && <p className="text-sm text-red-600">{ERRORES[sp.error]}</p>}
          {sp?.ok && <p className="text-sm text-marino">Cambios guardados</p>}
          <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar cambios</button>
        </form>
      </main>
    </>
  );
}
