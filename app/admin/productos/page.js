import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { crearProducto, cambiarActivo } from "../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const TIPOS = { clave: "Clave", cuenta: "Cuenta", recarga: "Recarga" };

export default async function Productos({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = String(sp?.q || "").trim().toLowerCase();
  const estado = ["venta", "oculto", "agotado"].includes(sp?.estado) ? sp.estado : "todos";

  const todos = await sql`
    select p.id, p.nombre, p.categoria, p.tipo, p.imagen_url,
      p.precio::float as precio, p.activo,
      (select count(*)::int from stock s where s.producto_id = p.id and s.estado = 'disponible') as disponibles
    from productos p order by p.id desc`;

  const agotado = (p) => p.activo && p.tipo !== "recarga" && p.disponibles === 0;
  const stats = {
    total: todos.length,
    venta: todos.filter((p) => p.activo).length,
    oculto: todos.filter((p) => !p.activo).length,
    agotado: todos.filter(agotado).length,
  };

  const lista = todos.filter((p) => {
    if (q && !`${p.nombre} ${p.categoria || ""}`.toLowerCase().includes(q)) return false;
    if (estado === "venta") return p.activo;
    if (estado === "oculto") return !p.activo;
    if (estado === "agotado") return agotado(p);
    return true;
  });

  const href = (e) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (e !== "todos") u.set("estado", e);
    const s = u.toString();
    return "/admin/productos" + (s ? "?" + s : "");
  };
  const chips = [
    ["todos", "Todos"],
    ["venta", "A la venta"],
    ["oculto", "Ocultos"],
    ["agotado", "Agotados"],
  ];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Productos</h1>
          <Link href="/admin/registro?f=producto" className="text-xs text-marino hover:underline">Ver historial</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            ["Total", stats.total, ""],
            ["A la venta", stats.venta, "text-marino"],
            ["Ocultos", stats.oculto, "text-neutral-500"],
            ["Agotados", stats.agotado, stats.agotado ? "text-red-600" : ""],
          ].map(([t, n, c]) => (
            <div key={t} className="rounded-2xl bg-white border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">{t}</p>
              <p className={"text-2xl font-semibold " + c}>{n}</p>
            </div>
          ))}
        </div>

        <details open={!!sp?.error} className="rounded-2xl bg-white border border-neutral-200 mb-5">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-marino">+ Nuevo producto</summary>
          <form action={crearProducto} className="p-4 pt-0 space-y-3">
            <input name="nombre" required placeholder="Nombre (ej: Windows 11 Pro)" className={campo} />
            <input name="categoria" placeholder="Categoría (ej: Windows)" className={campo} />
            <input name="precio" required inputMode="decimal" placeholder="Precio en Bs" className={campo} />
            <textarea name="descripcion" rows={2} placeholder="Descripción corta" className={campo} />
            {sp?.error === "nombre" && <p className="text-sm text-red-600">Falta el nombre</p>}
            {sp?.error === "precio" && <p className="text-sm text-red-600">El precio no es válido</p>}
            <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar producto</button>
          </form>
        </details>
        {sp?.ok && <p className="text-sm text-marino mb-3">Producto guardado</p>}

        <form method="get" className="flex gap-2 mb-3">
          {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
          <input name="q" defaultValue={q} placeholder="Buscar producto o categoría" className={campo + " !py-2"} />
          <button className="rounded-xl bg-marino text-white px-4 text-sm">Buscar</button>
        </form>

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

        <ul className="space-y-3">
          {lista.length === 0 && <li className="text-sm text-neutral-500">No hay productos con ese filtro.</li>}
          {lista.map((p) => {
            const bajo = p.tipo !== "recarga" && p.disponibles <= 2;
            return (
              <li key={p.id} className="rounded-2xl bg-white border border-neutral-200 p-3 flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center text-neutral-400 text-xs">
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen_url} alt="" loading="lazy" className="h-full w-full object-cover" />
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
                  </p>
                  <p className="text-sm font-semibold">
                    Bs {p.precio.toFixed(2)}{" "}
                    <span className={"text-xs font-normal " + (bajo ? "text-red-600" : "text-neutral-500")}>
                      {p.tipo === "recarga" ? "· Bajo pedido" : `· ${p.disponibles} en stock`}
                    </span>
                  </p>
                </div>
                <form action={cambiarActivo}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    className={
                      "text-xs rounded-full px-3 py-1 border " +
                      (p.activo ? "border-esmeralda text-marino" : "border-neutral-300 text-neutral-500")
                    }
                  >
                    {p.activo ? "A la venta" : "Oculto"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
