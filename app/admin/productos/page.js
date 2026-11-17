import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { crearProducto, cambiarActivo } from "../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-[#1e1e21] border border-neutral-700 px-4 py-3 outline-none focus:border-acento";

export default async function Productos({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const lista = await sql`
    select p.id, p.nombre, p.categoria, p.precio::float as precio, p.activo,
      (select count(*)::int from stock s where s.producto_id = p.id and s.estado = 'disponible') as disponibles
    from productos p order by p.id desc`;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Productos</h1>

        <form action={crearProducto} className="rounded-2xl bg-[#161618] border border-neutral-800 p-4 space-y-3">
          <input name="nombre" required placeholder="Nombre (ej: Windows 11 Pro)" className={campo} />
          <input name="categoria" placeholder="Categoría (ej: Windows)" className={campo} />
          <input name="precio" required inputMode="decimal" placeholder="Precio en Bs" className={campo} />
          <textarea name="descripcion" rows={2} placeholder="Descripción corta" className={campo} />
          {sp?.error === "nombre" && <p className="text-sm text-red-400">Falta el nombre</p>}
          {sp?.error === "precio" && <p className="text-sm text-red-400">El precio no es válido</p>}
          {sp?.ok && <p className="text-sm text-green-400">Producto guardado</p>}
          <button className="w-full rounded-xl bg-acento text-[#181108] font-semibold py-3">Guardar producto</button>
        </form>

        <ul className="mt-6 space-y-3">
          {lista.length === 0 && <li className="text-sm text-neutral-400">Todavía no hay productos.</li>}
          {lista.map((p) => (
            <li key={p.id} className="rounded-2xl bg-[#161618] border border-neutral-800 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.nombre}</p>
                <p className="text-xs text-neutral-400">
                  {p.categoria || "Sin categoría"} · Bs {p.precio.toFixed(2)} · {p.disponibles} disponibles
                </p>
              </div>
              <form action={cambiarActivo}>
                <input type="hidden" name="id" value={p.id} />
                <button className={"text-xs rounded-full px-3 py-1 border " + (p.activo ? "border-green-700 text-green-400" : "border-neutral-600 text-neutral-400")}>
                  {p.activo ? "A la venta" : "Oculto"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
