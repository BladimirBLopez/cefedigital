import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import FormPlan from "@/components/FormPlan";
import { agregarPlan, editarPrecioPlan, cambiarActivoPlan, borrarPlan } from "@/app/admin/acciones-planes";

export const dynamic = "force-dynamic";

const ERRORES = {
  datos: "Revisa pantallas y meses",
  precio: "El precio no es válido",
  costo: "El costo no es válido",
  repetido: "Ya existe un plan igual (mismas pantallas y meses)",
  usado: "Este plan ya tiene pedidos. No se puede borrar, mejor desactívalo.",
};
const mini = "w-24 rounded-lg bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-intenso";

export default async function Planes({ params, searchParams }) {
  await requireAdmin();
  const { id: idTxt } = await params;
  const sp = await searchParams;
  const id = Number(idTxt);
  if (!Number.isInteger(id)) notFound();
  const [prod] = await sql`select id, nombre from productos where id = ${id}`;
  if (!prod) notFound();
  const planes = await sql`
    select id, nombre, perfil, pantallas, meses_pagados, meses_gratis, duracion_dias,
           costo::float as costo, precio::float as precio, activo
    from planes where producto_id = ${id} order by orden, id`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Link href={`/admin/productos/${id}`} className="text-sm font-medium text-marino">← Volver a {prod.nombre}</Link>
        <h1 className="text-xl font-semibold">Planes de {prod.nombre}</h1>
        {ERRORES[sp?.error] && <p className="text-sm text-red-600">{ERRORES[sp.error]}</p>}

        <FormPlan action={agregarPlan} productoId={id} />

        <ul className="space-y-3">
          {planes.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay planes. Sin planes, el cliente elige cantidad y paga el precio base.</li>}
          {planes.map((p) => {
            const gan = p.costo == null ? null : p.precio - p.costo;
            return (
              <li key={p.id} className={"rounded-2xl bg-white border border-neutral-200 p-4 " + (p.activo ? "" : "opacity-60")}>
                <p className="font-medium">{p.nombre}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {p.meses_pagados + p.meses_gratis} meses de servicio · {p.duracion_dias} días
                  {gan !== null && <> · Ganancia Bs {gan.toFixed(2)}</>}
                </p>
                <form action={editarPrecioPlan} className="flex flex-wrap items-end gap-2 mt-3">
                  <input type="hidden" name="producto_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />
                  <label className="text-[11px] text-neutral-500">Precio<input name="precio" inputMode="decimal" defaultValue={p.precio} className={mini + " block mt-0.5"} /></label>
                  <label className="text-[11px] text-neutral-500">Costo<input name="costo" inputMode="decimal" defaultValue={p.costo ?? ""} className={mini + " block mt-0.5"} /></label>
                  <button className="text-xs rounded-full bg-intenso hover:bg-marino text-white font-semibold px-3 py-2">Guardar</button>
                </form>
                <div className="flex gap-2 mt-3">
                  <form action={cambiarActivoPlan}>
                    <input type="hidden" name="producto_id" value={id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs rounded-full border border-neutral-300 text-neutral-600 px-3 py-1.5">{p.activo ? "Desactivar" : "Activar"}</button>
                  </form>
                  <form action={borrarPlan}>
                    <input type="hidden" name="producto_id" value={id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs rounded-full border border-red-300 text-red-600 px-3 py-1.5">Borrar</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
