import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes, limpiarWhatsapp } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const ESTADOS = {
  pendiente: "Esperando tu pago",
  pagado: "Pago recibido",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default async function Pedido({ params }) {
  const { codigo } = await params;
  const aj = await obtenerAjustes();
  const [ped] = await sql`
    select p.id, p.codigo, p.total::float as total, p.estado, c.nombre
    from pedidos p join clientes c on c.id = p.cliente_id
    where p.codigo = ${String(codigo).toUpperCase()}`;
  if (!ped) notFound();

  const items = await sql`
    select pi.cantidad, pr.nombre
    from pedido_items pi join productos pr on pr.id = pi.producto_id
    where pi.pedido_id = ${ped.id}`;
  const entregas =
    ped.estado === "entregado"
      ? await sql`
          select s.id, s.dato, pr.nombre
          from stock s join productos pr on pr.id = s.producto_id
          where s.pedido_id = ${ped.id} order by s.id`
      : [];

  const n = limpiarWhatsapp(aj.whatsapp);
  const msg = encodeURIComponent(`Hola, hice el pedido ${ped.codigo} por Bs ${ped.total.toFixed(2)}. Te envío mi comprobante de pago.`);

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="rounded-2xl bg-[#161618] border border-neutral-800 p-5">
          <p className="text-xs text-neutral-400">Tu pedido</p>
          <p className="text-xl font-semibold font-mono text-acento">{ped.codigo}</p>
          <p className="text-sm mt-2">Estado: <b>{ESTADOS[ped.estado] || ped.estado}</b></p>
          <ul className="text-sm text-neutral-300 mt-3 space-y-1">
            {items.map((i, k) => (<li key={k}>{i.cantidad} x {i.nombre}</li>))}
          </ul>
          <p className="text-lg font-semibold mt-3">Total: Bs {ped.total.toFixed(2)}</p>
          <p className="text-xs text-neutral-400 mt-2">Guarda este código: con él puedes ver tu pedido cuando quieras.</p>
        </div>

        {ped.estado === "pendiente" && (
          <div className="rounded-2xl bg-[#161618] border border-neutral-800 p-5">
            <h2 className="font-semibold mb-2">Cómo pagar</h2>
            <p className="text-sm text-neutral-300 whitespace-pre-line">
              {aj.instrucciones_pago || "Escríbenos por WhatsApp y te damos los datos para pagar."}
            </p>
            {n && (
              <a href={`https://wa.me/${n}?text=${msg}`} className="block text-center mt-4 rounded-xl bg-acento text-[#181108] font-semibold py-3">
                Enviar comprobante por WhatsApp
              </a>
            )}
            <p className="text-xs text-neutral-400 mt-3">Cuando confirmemos tu pago, tus datos aparecen aquí mismo. Recarga esta página.</p>
          </div>
        )}

        {ped.estado === "entregado" && (
          <div className="rounded-2xl bg-[#161618] border border-green-900 p-5">
            <h2 className="font-semibold mb-3 text-green-400">Tus claves y cuentas</h2>
            <ul className="space-y-2">
              {entregas.map((e) => (
                <li key={e.id} className="rounded-xl bg-[#1e1e21] px-4 py-3">
                  <p className="text-xs text-neutral-400">{e.nombre}</p>
                  <p className="font-mono text-sm break-all select-all">{e.dato}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-400 mt-3">Mantén presionado para copiar. No compartas este enlace con nadie.</p>
          </div>
        )}

        {ped.estado === "cancelado" && (
          <p className="text-sm text-neutral-400 text-center">Este pedido fue cancelado. Si fue un error, escríbenos por WhatsApp.</p>
        )}
      </main>
    </>
  );
}
