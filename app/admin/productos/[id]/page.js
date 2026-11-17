import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { editarProducto } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

export default async function EditarProducto({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();
  const [p] = await sql`
    select id, nombre, slug, categoria, descripcion, instrucciones, tipo, campo_cliente, precio::float as precio, imagen_url
    from productos where id = ${pid}`;
  if (!p) notFound();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/admin/productos" className="text-sm text-neutral-500">← Volver a productos</Link>
        <h1 className="text-xl font-semibold mt-3 mb-4">Editar producto</h1>

        <form action={editarProducto} className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <label className="block text-xs text-neutral-500">Nombre</label>
          <input name="nombre" required defaultValue={p.nombre} className={campo} />
          <label className="block text-xs text-neutral-500">Tipo de producto</label>
          <select name="tipo" defaultValue={p.tipo || "clave"} className={campo}>
            <option value="clave">Clave o licencia (usa stock)</option>
            <option value="cuenta">Cuenta de streaming (usa stock)</option>
            <option value="recarga">Recarga (el cliente pone su ID, sin stock)</option>
          </select>
          <label className="block text-xs text-neutral-500">Categoría</label>
          <input name="categoria" defaultValue={p.categoria || ""} className={campo} />
          <label className="block text-xs text-neutral-500">Precio en Bs</label>
          <input name="precio" required inputMode="decimal" defaultValue={p.precio} className={campo} />
          <label className="block text-xs text-neutral-500">Descripción</label>
          <textarea name="descripcion" rows={4} defaultValue={p.descripcion || ""} className={campo} />
          <label className="block text-xs text-neutral-500">Solo recargas: qué dato le pides al cliente (ej: Tu ID de jugador)</label>
          <input name="campo_cliente" defaultValue={p.campo_cliente || ""} placeholder="Tu ID de jugador" className={campo} />
          <label className="block text-xs text-neutral-500">Cómo activar (lo ve el cliente cuando recibe su clave)</label>
          <textarea name="instrucciones" rows={5} defaultValue={p.instrucciones || ""} placeholder={"1. Abre Configuración > Activación\n2. Pega la clave\n3. Reinicia el equipo"} className={campo} />
          <label className="block text-xs text-neutral-500">Link de la imagen (debe empezar con https://)</label>
          <input name="imagen_url" defaultValue={p.imagen_url || ""} placeholder="https://..." className={campo} />
          {p.imagen_url && <img src={p.imagen_url} alt={p.nombre} className="w-32 h-32 object-cover rounded-xl border border-neutral-200" />}
          {sp?.error === "nombre" && <p className="text-sm text-red-600">Falta el nombre</p>}
          {sp?.error === "precio" && <p className="text-sm text-red-600">El precio no es válido</p>}
          {sp?.error === "imagen" && <p className="text-sm text-red-600">El link de la imagen debe empezar con https://</p>}
          {sp?.ok && <p className="text-sm text-marino">Cambios guardados</p>}
          <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar cambios</button>
        </form>
      </main>
    </>
  );
}
