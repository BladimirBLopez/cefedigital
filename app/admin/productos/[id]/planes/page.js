
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import { MODALIDADES, textoModalidad, modalidadVieja } from "@/lib/modalidades";
import FormPlan from "@/components/FormPlan";
import { agregarPlan, editarPrecioPlan, editarModalidadPlan, cambiarActivoPlan, borrarPlan } from "@/app/admin/acciones-planes";

export const dynamic = "force-dynamic";

const ERRORES = {
  datos: "Revisa pantallas y meses",
  precio: "El precio no es válido",
  costo: "El costo no es válido",
  modalidad: "Selecciona una modalidad válida.",
  repetido: "Ya existe un plan con esa modalidad, pantallas y duración.",
  usado: "Este plan ya tiene pedidos. No se puede borrar, mejor desactívalo.",
  plan_no_existe: "El plan ya no existe."
};

const AVISOS = {
  modalidad_actualizada: "La modalidad del plan se actualizó correctamente."
};

const mini = "w-24 rounded-lg bg-neutral-100 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-intenso";

export default async function Planes({ params, searchParams }) {
  await requireAdmin();
  await asegurarEsquema();

  const { id: idTxt } = await params;
  const sp = await searchParams;
  const id = Number(idTxt);

  if (!Number.isInteger(id)) notFound();

  const [prod] = await sql`select id, nombre from productos where id = ${id}`;
  if (!prod) notFound();

  const planes = await sql`
    select id, perfil, pantallas, meses_pagados, duracion_dias,
           costo::float as costo, precio::float as precio, compartida, modalidad, activo
    from planes where producto_id = ${id}
    order by orden, id`;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Link href={`/admin/productos/${id}`} className="text-sm font-medium text-marino">
          ← Volver a {prod.nombre}
        </Link>

        <h1 className="text-xl font-semibold">Planes de {prod.nombre}</h1>

        {ERRORES[sp?.error] && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERRORES[sp.error]}
          </p>
        )}

        {AVISOS[sp?.aviso] && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {AVISOS[sp.aviso]}
          </p>
        )}

        <FormPlan action={agregarPlan} productoId={id} />

        <ul className="space-y-3">
          {planes.length === 0 && (
            <li className="text-sm text-neutral-500">
              Todavía no hay planes. Sin planes, el cliente elige cantidad y paga el precio base.
            </li>
          )}

          {planes.map((p) => {
            const gan = p.costo == null ? null : p.precio - p.costo;
            const modalidad = textoModalidad(p.modalidad || modalidadVieja(p.compartida)) || "Sin modalidad";

            return (
              <li key={p.id} className={"rounded-2xl bg-white border border-neutral-200 p-4 " + (p.activo ? "" : "opacity-60")}>
                <p className="font-medium">
                  {p.perfil} · {p.meses_pagados} {p.meses_pagados === 1 ? "mes" : "meses"}
                </p>

                <p className="text-xs text-neutral-500 mt-1">
                  {modalidad} · {p.duracion_dias} días de servicio
                  {gan !== null && <> · Ganancia Bs {gan.toFixed(2)}</>}
                </p>

                <form action={editarPrecioPlan} className="flex flex-wrap items-end gap-2 mt-3">
                  <input type="hidden" name="producto_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />

                  <label className="text-[11px] text-neutral-500">
                    Precio
                    <input name="precio" inputMode="decimal" defaultValue={p.precio} className={mini + " block mt-0.5"} />
                  </label>

                  <label className="text-[11px] text-neutral-500">
                    Costo
                    <input name="costo" inputMode="decimal" defaultValue={p.costo ?? ""} className={mini + " block mt-0.5"} />
                  </label>

                  <button className="text-xs rounded-full bg-intenso hover:bg-marino text-white font-semibold px-3 py-2">
                    Guardar
                  </button>
                </form>

                <form
                  action={editarModalidadPlan}
                  className="flex flex-wrap items-end gap-2 mt-3"
                >
                  <input type="hidden" name="producto_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />

                  <label className="flex-1 min-w-[180px] text-[11px] text-neutral-500">
                    Cambiar modalidad
                    <select
                      name="modalidad"
                      defaultValue={p.modalidad || modalidadVieja(p.compartida)}
                      className="mt-0.5 w-full rounded-lg bg-neutral-100 border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-intenso"
                    >
                      {MODALIDADES.map(([v, tx]) => (
                        <option key={v || "ninguna"} value={v}>{tx}</option>
                      ))}
                    </select>
                  </label>

                  <button className="text-xs rounded-full bg-intenso hover:bg-marino text-white font-semibold px-4 py-2.5">
                    Guardar modalidad
                  </button>
                </form>

                <div className="flex gap-2 mt-3">
                  <form action={cambiarActivoPlan}>
                    <input type="hidden" name="producto_id" value={id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs rounded-full border border-neutral-300 text-neutral-600 px-3 py-1.5">
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>

                  <form action={borrarPlan}>
                    <input type="hidden" name="producto_id" value={id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs rounded-full border border-red-300 text-red-600 px-3 py-1.5">
                      Borrar
                    </button>
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
