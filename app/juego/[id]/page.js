import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { optimizar } from "@/lib/imagen";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  await asegurarEsquema();
  const { id } = await params;
  const [f] = await sql`
    select max(central_one_family_name) as nombre
    from productos
    where proveedor = 'central_one' and activo and proveedor_disponible = true
      and central_one_family_id = ${String(id)}
  `;
  return { title: f && f.nombre ? f.nombre : "Juego no encontrado" };
}

export default async function Juego({ params, searchParams }) {
  await asegurarEsquema();
  const { id } = await params;
  const sp = await searchParams;
  const aj = await obtenerAjustes();
  const familia = String(id);
  const region = sp?.region ? String(sp.region).slice(0, 40) : null;

  const regiones = await sql`
    select central_one_region as region, count(*)::int as n
    from productos
    where proveedor = 'central_one' and activo and proveedor_disponible = true
      and central_one_family_id = ${familia}
    group by central_one_region
    order by count(*) desc, central_one_region
  `;

  if (regiones.length === 0) notFound();

  const regionActiva =
    region && regiones.some((r) => r.region === region)
      ? region
      : regiones[0].region;

  const [{ nombre }] = await sql`
    select max(central_one_family_name) as nombre
    from productos
    where proveedor = 'central_one' and central_one_family_id = ${familia}
  `;

  const [logo] = await sql`
    select imagen_url from juegos_imagen where familia_id = ${familia}
  `;

  const paquetes = await sql`
    select slug, nombre, precio::float as precio
    from productos
    where proveedor = 'central_one' and activo and proveedor_disponible = true
      and central_one_family_id = ${familia}
      and central_one_region is not distinct from ${regionActiva}
    order by precio asc nulls last, id
    limit 200
  `;

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:pt-7">
        <Link href="/" className="text-xs font-bold text-intenso hover:underline">
          ← Inicio
        </Link>

        <div className="mt-3 flex items-center gap-3">
          {logo && logo.imagen_url && (
            <img
              src={optimizar(logo.imagen_url, 160)}
              alt={nombre}
              className="h-14 w-14 rounded-xl border border-neutral-200 bg-white object-contain p-1"
            />
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-marino">
            {nombre}
          </h1>
        </div>

        {regiones.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {regiones.map((r) => {
              const activa = r.region === regionActiva;
              return (
                <Link
                  key={r.region || "sin"}
                  href={`/juego/${encodeURIComponent(familia)}?region=${encodeURIComponent(r.region || "")}`}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-bold " +
                    (activa
                      ? "border-intenso bg-intenso text-white"
                      : "border-neutral-300 bg-white text-marino")
                  }
                >
                  {r.region || "General"} ({r.n})
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {paquetes.map((p) => (
            <Link
              key={p.slug}
              href={`/producto/${encodeURIComponent(p.slug)}`}
              className="flex min-w-0 flex-col justify-between rounded-2xl border border-intenso/25 bg-marino p-3 shadow-md transition hover:border-electrico"
            >
              <span className="line-clamp-3 text-sm font-semibold leading-5 text-white">
                {p.nombre}
              </span>
              <span className="mt-3 text-[15px] font-extrabold text-cian sm:text-lg">
                {p.precio > 0 ? "Bs " + p.precio.toFixed(2) : "Consultar precio"}
              </span>
            </Link>
          ))}
        </div>
      </main>

      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
