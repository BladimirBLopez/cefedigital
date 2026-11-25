import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import CamposProducto from "@/components/CamposProducto";
import SelectorCategoria from "@/components/SelectorCategoria";
import { sql } from "@/lib/db";
import { crearProducto } from "../../actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";
const tarjeta = "rounded-2xl bg-white border border-neutral-200 p-4 space-y-3";
const rotulo = "block text-xs font-medium text-neutral-500";
const titulo = "text-sm font-semibold text-marino";

const ERRORES = {
  nombre: "Falta el nombre",
  tipo: "Elige el tipo de producto",
  precio: "El precio no es válido",
  vence: "La fecha de vencimiento no es válida",
  duracion: "La duración debe ser un número de días (1 o más)",
  foto: "No se pudo subir la foto (máx. 4 MB)",
  planes: "Escribe al menos un precio para la cuenta.",
  planesdb: "No se pudieron guardar los planes. No se creó nada, intenta otra vez.",
  repetidas: "Repetiste un plan con la misma modalidad, pantallas y duración. Cambia uno.",
  caracteristicas: "Revisa la cantidad de perfiles y la calidad del plan.",
};

export default async function NuevoProducto({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const cats = await sql`
    select categoria from (
      select nombre as categoria, orden from categorias
      union all
      select categoria, 9999 from productos where categoria is not null
    ) t group by categoria order by min(orden), categoria`;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/admin/productos" className="text-xs text-marino hover:underline">← Productos</Link>
        <h1 className="text-xl font-semibold mt-2 mb-4">Nuevo producto</h1>

        {ERRORES[sp?.error] && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error]}</p>
        )}

        <form action={crearProducto} className="space-y-4">
          <section className={tarjeta}>
            <h2 className={titulo}>1. Foto y nombre</h2>
            <SubirFoto />
            <label className={rotulo}>
              Nombre
              <input name="nombre" required placeholder="Ej: Netflix, Windows 11 Pro" className={campo + " mt-1"} />
            </label>
          </section>

          <section className={tarjeta}>
            <h2 className={titulo}>2. Tipo y precios</h2>
            <CamposProducto conPlan />
          </section>

          <section className={tarjeta}>
            <h2 className={titulo}>3. Detalles</h2>
            <SelectorCategoria categorias={cats.map((c) => c.categoria)} />
            <label className={rotulo}>
              Descripción corta
              <textarea name="descripcion" rows={2} className={campo + " mt-1"} />
            </label>
            <label className={rotulo}>
              Instrucciones de activación (opcional)
              <textarea name="instrucciones" rows={3} className={campo + " mt-1"} />
            </label>
            <label className={rotulo}>
              Vence lo que compraste al proveedor (opcional)
              <input name="vence" type="date" className={campo + " mt-1"} />
            </label>
          </section>

          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Link href="/admin/productos" className="rounded-xl border border-neutral-300 px-5 py-3 text-center font-semibold text-neutral-600">Cancelar</Link>
            <button className="flex-1 rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar producto</button>
          </div>
        </form>
      </main>
    </>
  );
}
