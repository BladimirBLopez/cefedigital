import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { asegurarRegistro } from "@/lib/registro";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const ESTILO = {
  crear: ["Nuevo", "bg-emerald-100 text-emerald-700"],
  editar: ["Edición", "bg-blue-100 text-blue-700"],
  activar: ["A la venta", "bg-emerald-100 text-emerald-700"],
  ocultar: ["Oculto", "bg-neutral-200 text-neutral-600"],
  stock_agregar: ["Stock +", "bg-emerald-100 text-emerald-700"],
  stock_borrar: ["Stock −", "bg-red-100 text-red-700"],
};

export default async function Registro({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = ["producto", "stock"].includes(sp?.f) ? sp.f : "todo";
  await asegurarRegistro();
  const filas =
    f === "todo"
      ? await sql`select id, creado, accion, detalle from registro_admin order by id desc limit 100`
      : await sql`select id, creado, accion, detalle from registro_admin where entidad = ${f} order by id desc limit 100`;

  const chips = [["todo", "Todo"], ["producto", "Productos"], ["stock", "Stock"]];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold">Registro</h1>
        <p className="text-xs text-neutral-500 mb-4">Últimos 100 cambios, hora de Bolivia.</p>

        <div className="flex gap-2 mb-4">
          {chips.map(([k, t]) => (
            <Link
              key={k}
              href={k === "todo" ? "/admin/registro" : `/admin/registro?f=${k}`}
              className={
                "rounded-full px-3 py-1 text-sm border " +
                (f === k ? "bg-marino text-white border-marino" : "bg-white border-neutral-300 text-neutral-600")
              }
            >
              {t}
            </Link>
          ))}
        </div>

        <ul className="space-y-2">
          {filas.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay movimientos.</li>}
          {filas.map((r) => {
            const [etq, cls] = ESTILO[r.accion] || [r.accion, "bg-neutral-200 text-neutral-600"];
            return (
              <li key={r.id} className="rounded-2xl bg-white border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={"text-xs rounded-full px-2 py-0.5 " + cls}>{etq}</span>
                  <span className="text-xs text-neutral-500">{fmt.format(new Date(r.creado))}</span>
                </div>
                <p className="text-sm mt-1 break-words">{r.detalle}</p>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
