import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { limpiarWhatsapp } from "@/lib/ajustes";
import AdminNav from "@/components/AdminNav";
import { confirmarPago, cancelarPedido } from "../acciones-pedidos";

export const dynamic = "force-dynamic";

const COLOR = {
  pendiente: "text-amber-700 border-amber-300",
  entregado: "text-marino border-esmeralda",
  cancelado: "text-neutral-500 border-neutral-300",
  pagado: "text-sky-400 border-sky-800",
};

export default async function Pedidos({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const pedidos = await sql`
    select p.id, p.codigo, p.total::float as total, p.estado, p.creado_en, c.nombre, c.whatsapp,
      (select string_agg(pi.cantidad || ' x ' || pr.nombre, ', ')
         from pedido_items pi join productos pr on pr.id = pi.producto_id
         where pi.pedido_id = p.id) as detalle
    from pedidos p join clientes c on c.id = p.cliente_id
    order by p.id desc limit 50`;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Pedidos</h1>
        {sp?.ok && <p className="text-sm text-marino mb-3">Pedido entregado: las claves ya le aparecen al cliente</p>}
        {sp?.error === "sin_stock" && (
          <p className="text-sm text-red-600 mb-3">No alcanza el stock. Agrega más en Claves y cuentas y vuelve a confirmar.</p>
        )}
        {sp?.error && sp.error !== "sin_stock" && <p className="text-sm text-red-600 mb-3">No se pudo confirmar ({sp.error})</p>}
        <ul className="space-y-3">
          {pedidos.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay pedidos.</li>}
          {pedidos.map((p) => (
            <li key={p.id} className="rounded-2xl bg-white border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-acento">{p.codigo}</p>
                  <p className="text-sm mt-1">{p.detalle}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {p.nombre} · {new Date(p.creado_en).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}
                  </p>
                </div>
                <span className={"text-xs rounded-full px-3 py-1 border " + (COLOR[p.estado] || "")}>{p.estado}</span>
              </div>
              <p className="font-semibold mt-2">Bs {p.total.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={`https://wa.me/${limpiarWhatsapp(p.whatsapp)}`}
                  className="text-xs rounded-full border border-neutral-300 text-neutral-600 px-3 py-1.5"
                >
                  WhatsApp del cliente
                </a>
                {p.estado === "pendiente" && (
                  <>
                    <form action={confirmarPago}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs rounded-full bg-intenso hover:bg-marino text-white font-semibold px-3 py-1.5">
                        Ya pagó: entregar
                      </button>
                    </form>
                    <form action={cancelarPedido}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs rounded-full border border-red-300 text-red-600 px-3 py-1.5">Cancelar</button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
