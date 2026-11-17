import Link from "next/link";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const cat = sp?.cat ? String(sp.cat) : null;
  const aj = await obtenerAjustes();
  const cats = await sql`select distinct categoria from productos where activo and categoria is not null order by 1`;
  const prods = await sql`
    select p.slug, p.nombre, p.categoria, p.precio::float as precio,
      (select count(*)::int from stock s where s.producto_id = p.id and s.estado = 'disponible') as disponibles
    from productos p
    where p.activo and (${cat}::text is null or p.categoria = ${cat})
    order by p.id desc`;
  const chip = (activo) =>
    "whitespace-nowrap rounded-full px-4 py-1.5 text-sm border " +
    (activo ? "bg-intenso text-white border-intenso" : "border-neutral-300 text-marino");

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-gradient-to-r from-intenso to-electrico p-6 text-white"><h1 className="text-2xl font-bold">{aj.nombre_tienda}</h1>
        <p className="text-sm text-white/90 mt-1">Productos digitales con entrega rápida</p><span className="inline-block mt-3 rounded-full bg-turquesa text-marino text-xs font-semibold px-3 py-1">Entrega después de confirmar tu pago</span></section>

        {cats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mt-5 pb-1">
            <Link href="/" className={chip(!cat)}>Todos</Link>
            {cats.map((c) => (
              <Link key={c.categoria} href={`/?cat=${encodeURIComponent(c.categoria)}`} className={chip(cat === c.categoria)}>
                {c.categoria}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-5">
          {prods.length === 0 && <p className="col-span-2 text-sm text-neutral-400">Pronto habrá productos.</p>}
          {prods.map((p) => (
            <Link key={p.slug} href={`/producto/${p.slug}`} className="rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition p-4 flex flex-col">
              <p className="text-xs text-acento">{p.categoria || "Digital"}</p>
              <p className="font-medium mt-1">{p.nombre}</p>
              <p className="text-lg font-semibold mt-auto pt-3">Bs {p.precio.toFixed(2)}</p>
              <p className={"text-xs mt-1 " + (p.disponibles > 0 ? "text-marino font-medium" : "text-neutral-500")}>
                {p.disponibles > 0 ? "Disponible" : "Agotado"}
              </p>
            </Link>
          ))}
        </div>
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
