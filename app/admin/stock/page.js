import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { descifrar } from "@/lib/cripto";
import { agregarStock, borrarStock } from "../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

const ERRORES = {
  producto: "Selecciona un producto válido.",
  vacio: "Escribe al menos una clave o cuenta.",
  stock_borrado: "No se pudo eliminar el registro de stock."
};

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

        <form action={agregarStock} className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
          <select name="producto_id" required className={campo} defaultValue="">
            <option value="" disabled>Elige el producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <textarea name="datos" rows={5} required placeholder={"Una clave o cuenta por línea\nAAAAA-BBBBB-CCCCC\ncorreo@ejemplo.com:clave"} className={campo} />
          {sp?.error && <p className="text-sm text-red-600">{ERRORES[sp.error] || "No se pudo completar la operación."}</p>}
          <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Agregar al stock</button>
        </form>

        <h2 className="text-sm text-neutral-500 mt-6 mb-2">Últimas 30 (se muestran tapadas)</h2>
        <ul className="space-y-2">
          {items.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay stock.</li>}
          {items.map((i) => (
            <li key={i.id} className="rounded-xl bg-white border border-neutral-200 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{i.nombre}</p>
                <p className="text-xs text-neutral-500 font-mono">{tapar(descifrar(i.dato))} · {i.estado}</p>
              </div>
              {i.estado === "disponible" && (
                <form action={borrarStock}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="text-xs text-red-600 border border-red-300 rounded-full px-3 py-1">Borrar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
