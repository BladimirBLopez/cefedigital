import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { crearPedido } from "@/app/tienda-actions";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";

export default async function Producto({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const aj = await obtenerAjustes();
  const [p] = await sql`
    select p.id, p.slug, p.nombre, p.categoria, p.descripcion, p.precio::float as precio,
      (select count(*)::int from stock s where s.producto_id = p.id and s.estado = 'disponible') as disponibles
    from productos p where p.slug = ${slug} and p.activo`;
  if (!p) notFound();
  const max = Math.min(5, p.disponibles);

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/" className="text-sm text-neutral-400">← Volver a la tienda</Link>
        <div className="mt-4 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          {p.categoria && <p className="text-xs text-acento">{p.categoria}</p>}
          <h1 className="text-xl font-semibold mt-1">{p.nombre}</h1>
          <p className="text-2xl font-semibold mt-3">Bs {p.precio.toFixed(2)}</p>
          {p.descripcion && <p className="text-sm text-neutral-600 mt-3 whitespace-pre-line">{p.descripcion}</p>}
          <p className="text-xs text-neutral-400 mt-3">Entrega después de confirmar tu pago</p>
        </div>

        {max === 0 ? (
          <p className="mt-6 text-center text-neutral-400">Producto agotado por ahora.</p>
        ) : (
          <form action={crearPedido} className="mt-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold">Hacer mi pedido</h2>
            <input type="hidden" name="producto_id" value={p.id} />
            <input type="hidden" name="slug" value={p.slug} />
            <input name="nombre" required maxLength={80} placeholder="Tu nombre" className={campo} />
            <input name="whatsapp" required inputMode="tel" placeholder="Tu WhatsApp (ej: 71234567)" className={campo} />
            <select name="cantidad" defaultValue="1" className={campo}>
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "unidad" : "unidades"}</option>
              ))}
            </select>
            {sp?.error === "datos" && <p className="text-sm text-red-600">Revisa tu nombre y tu número de WhatsApp</p>}
            {sp?.error === "stock" && <p className="text-sm text-red-600">No alcanza el stock para esa cantidad</p>}
            <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3 transition">Pedir ahora</button>
          </form>
        )}
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
