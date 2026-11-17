import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { agregarStock, borrarStock } from "../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-[#1e1e21] border border-neutral-700 px-4 py-3 outline-none focus:border-acento";

function tapar(dato) {
  return dato.slice(0, 4) + "••••••";
}

export default async function Stock({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const productos = await sql`select id, nombre from productos order by nombre`;
  const items = await sql`
    select s.id, s.dato, s.estado, p.nombre
    from stock s join productos p on p.id = s.producto_id
    order by s.id desc limit 30`;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Claves y cuentas</h1>

        <form action={agregarStock} className="rounded-2xl bg-[#161618] border border-neutral-800 p-4 space-y-3">
          <select name="producto_id" required className={campo} defaultValue="">
            <option value="" disabled>Elige el producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <textarea name="datos" rows={5} required placeholder={"Una clave o cuenta por línea\nAAAAA-BBBBB-CCCCC\ncorreo@ejemplo.com:clave"} className={campo} />
          {sp?.error && <p className="text-sm text-red-400">Elige un producto y escribe al menos una línea</p>}
          {sp?.ok && <p className="text-sm text-green-400">Se agregaron {sp.ok}</p>}
          <button className="w-full rounded-xl bg-acento text-[#181108] font-semibold py-3">Agregar al stock</button>
        </form>

        <h2 className="text-sm text-neutral-400 mt-6 mb-2">Últimas 30 (se muestran tapadas)</h2>
        <ul className="space-y-2">
          {items.length === 0 && <li className="text-sm text-neutral-400">Todavía no hay stock.</li>}
          {items.map((i) => (
            <li key={i.id} className="rounded-xl bg-[#161618] border border-neutral-800 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{i.nombre}</p>
                <p className="text-xs text-neutral-400 font-mono">{tapar(i.dato)} · {i.estado}</p>
              </div>
              {i.estado === "disponible" && (
                <form action={borrarStock}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="text-xs text-red-400 border border-red-900 rounded-full px-3 py-1">Borrar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
