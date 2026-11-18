import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import { asegurarEsquema } from "@/lib/esquema";
import { estadoVence } from "@/lib/vence";
import { crearProducto } from "../actions";
import Interruptor from "@/components/Interruptor";
import SwitchVenta from "@/components/SwitchVenta";
import BorrarProducto from "@/components/BorrarProducto";

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

  const todos = await sql`
    select p.id, p.nombre, p.categoria, p.tipo, p.imagen_url, p.vence::text as vence,
      p.precio::float as precio, p.activo
    from productos p order by p.id desc`;

  const vencen = (p) => ["vencido", "pronto"].includes(estadoVence(p.vence).clave);
  const stats = {
    total: todos.length,
    venta: todos.filter((p) => p.activo).length,
    vencen: todos.filter(vencen).length,
    oculto: todos.filter((p) => !p.activo).length,
  };

  const lista = todos.filter((p) => {
    if (q && !`${p.nombre} ${p.categoria || ""}`.toLowerCase().includes(q)) return false;
    if (cats.length && !cats.includes(p.categoria || "Sin categoría")) return false;
    if (estado === "venta") return p.activo;
    if (estado === "oculto") return !p.activo;
    if (estado === "vencen") return vencen(p);
    return true;
  });

  const href = (e) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (e !== "todos") u.set("estado", e);
    if (cats.length) u.set("cat", cats.join("|"));
    const s = u.toString();
    return "/admin/productos" + (s ? "?" + s : "");
  };
  const categorias = [...new Set(todos.map((p) => p.categoria || "Sin categoría"))].sort((a, b) => a.localeCompare(b, "es"));
  const hrefCat = (c) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
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
          {cats.length > 0 && <input type="hidden" name="cat" value={cats.join("|")} />}
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

        <ul className="space-y-3">
          {lista.length === 0 && <li className="text-sm text-neutral-500">No hay productos con ese filtro.</li>}
          {lista.map((p) => {
            const bajo = false;
            const ev = estadoVence(p.vence);
            return (
              <li key={p.id} className="rounded-2xl bg-white border border-neutral-200 p-3 flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center text-neutral-400 text-xs">
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
                      {p.tipo === "recarga" ? "· Bajo pedido" : "· Entrega por WhatsApp"}
                    </span>
                  </p>
                  {ev.clave !== "sin" && (
                    <span className={"inline-block mt-1 text-xs rounded-full px-2 py-0.5 " + ev.clase}>{ev.texto}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/admin/productos/${p.id}`} className="rounded-full border border-marino px-3 py-1 text-xs font-semibold text-marino hover:bg-marino hover:text-white">Editar</Link>
                  <Interruptor id={p.id} activo={p.activo} />
                  <BorrarProducto id={p.id} nombre={p.nombre} />
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
