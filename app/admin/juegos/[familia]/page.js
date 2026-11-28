import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { asegurarEsquema } from "@/lib/esquema";
import AdminNav from "@/components/AdminNav";
import SubirFoto from "@/components/SubirFoto";
import SelectorCategoria from "@/components/SelectorCategoria";
import Interruptor from "@/components/Interruptor";
import EstrellaDestacado from "@/components/EstrellaDestacado";
import PrecioPaquete from "@/components/PrecioPaquete";
import InterruptorJuego from "@/components/InterruptorJuego";
import { guardarFichaJuego } from "@/app/admin/acciones-juego-ficha";

export const dynamic = "force-dynamic";

const tarjeta = "rounded-2xl bg-white border border-neutral-200 p-4 space-y-3";
const titulo = "text-sm font-semibold text-marino";
const ERRORES = { foto: "No se pudo subir la foto (máx. 4 MB)" };

function Kpi({ t, v }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-center">
      <p className="text-[11px] text-neutral-500">{t}</p>
      <p className="mt-0.5 text-sm font-semibold text-marino">{v}</p>
    </div>
  );
}

export default async function FichaJuego({ params, searchParams }) {
  await requireAdmin();
  await asegurarEsquema();
  const { familia } = await params;
  const sp = await searchParams;
  let id = familia;
  try {
    id = decodeURIComponent(familia);
  } catch {}

  const [g] = await sql`
    select max(central_one_family_name) as nombre,
           count(*)::int as total,
           count(*) filter (where activo)::int as publicados,
           count(*) filter (where not activo and precio > 0 and proveedor_disponible)::int as publicables,
           (min(precio) filter (where precio > 0))::float as desde,
           max(categoria) as categoria
    from productos
    where proveedor = 'central_one' and central_one_family_id = ${id}`;
  if (!g || !g.total) notFound();

  const logoFila = await sql`select imagen_url from juegos_imagen where familia_id = ${id}`;
  const logo = logoFila[0]?.imagen_url || "";

  const paquetes = await sql`
    select id, nombre, activo, destacado, proveedor_disponible,
           coalesce(central_one_region, 'General') as region,
           precio::float as precio,
           costo_proveedor_bs_central_one::float as costo,
           precio_sugerido::float as sugerido
    from productos
    where proveedor = 'central_one' and central_one_family_id = ${id}
    order by central_one_region nulls first, precio, id
    limit 2000`;
  const porRegion = {};
  for (const x of paquetes) (porRegion[x.region] ||= []).push(x);

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
        <Link href="/admin/productos?prov=central_one" className="text-xs text-marino hover:underline">← Productos · Central One</Link>

        <div className="mb-4 mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-[10px] text-neutral-400">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-full w-full object-contain" />
            ) : (
              "Sin foto"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{g.nombre}</h1>
            <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">Central One</span>
          </div>
          <div className="shrink-0 text-center">
            <InterruptorJuego familia={id} publicados={g.publicados} publicables={g.publicables} nombre={g.nombre} />
            <p className="mt-1 text-[10px] text-neutral-500">{g.publicados > 0 ? "A la venta" : "Oculto"}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Kpi t="Paquetes" v={g.total} />
          <Kpi t="Publicados" v={g.publicados} />
          <Kpi t="Desde" v={g.desde ? "Bs " + g.desde.toFixed(2) : "—"} />
        </div>

        {sp?.ok && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Cambios guardados.</p>}
        {ERRORES[sp?.error] && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORES[sp.error]}</p>}

        <form action={guardarFichaJuego} className="mb-4 space-y-4">
          <input type="hidden" name="familia_id" value={id} />
          <section className={tarjeta}>
            <h2 className={titulo}>Logo y categoría del juego</h2>
            <SubirFoto actual={logo} />
            <SelectorCategoria categorias={cats.map((c) => c.categoria)} actual={g.categoria || ""} />
            <p className="text-[11px] text-neutral-500">La categoría se aplica a los {g.total} paquetes del juego.</p>
          </section>
          <button className="w-full rounded-xl bg-intenso py-3 font-semibold text-white hover:bg-marino">Guardar cambios</button>
        </form>

        <section className={tarjeta}>
          <h2 className={titulo}>Paquetes</h2>
          {Object.entries(porRegion).map(([region, items]) => (
            <div key={region}>
              <p className="pt-1 text-xs font-bold uppercase text-neutral-500">{region} · {items.length}</p>
              {items.map((x) => (
                <div key={x.id} className="border-b border-neutral-100 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/productos/${x.id}`} className="block min-w-0 flex-1 truncate text-xs font-medium text-marino hover:underline">
                      {x.nombre}
                    </Link>
                    <EstrellaDestacado id={x.id} destacado={x.destacado} />
                    <Interruptor id={x.id} activo={x.activo} />
                  </div>
                  <PrecioPaquete id={x.id} precio={x.precio} costo={x.costo || 0} sugerido={x.sugerido || 0} sinStock={!x.proveedor_disponible} />
                </div>
              ))}
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
