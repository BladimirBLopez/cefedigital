import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes, limpiarWhatsapp } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { descifrar } from "@/lib/cripto";

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
    select pi.cantidad, pi.dato_cliente, pr.tipo, pr.nombre
    from pedido_items pi join productos pr on pr.id = pi.producto_id
    where pi.pedido_id = ${ped.id}`;
  const entregas =
    ped.estado === "entregado"
      ? await sql`
          select s.id, s.dato, pr.nombre, pr.instrucciones
          from stock s join productos pr on pr.id = s.producto_id
          where s.pedido_id = ${ped.id} order by s.id`
      : [];

  const hayRecarga = items.some((i) => i.tipo === "recarga");
  const n = limpiarWhatsapp(aj.whatsapp);
  const msg = encodeURIComponent(`Hola, hice el pedido ${ped.codigo} por Bs ${ped.total.toFixed(2)}. Te envío mi comprobante de pago.`);

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          <p className="text-xs text-neutral-500">Tu pedido</p>
          <p className="text-xl font-semibold font-mono text-acento">{ped.codigo}</p>
          <p className="text-sm mt-2">Estado: <b>{ESTADOS[ped.estado] || ped.estado}</b></p>
          <ul className="text-sm text-neutral-600 mt-3 space-y-1">
            {items.map((i, k) => (<li key={k}>{i.cantidad} x {i.nombre}{i.dato_cliente && <span className="font-mono text-xs text-neutral-500"> [ID: {i.dato_cliente}]</span>}</li>))}
          </ul>
          <p className="text-lg font-semibold mt-3">Total: Bs {ped.total.toFixed(2)}</p>
          <p className="text-xs text-neutral-500 mt-2">Guarda este código: con él puedes ver tu pedido cuando quieras.</p>
        </div>

        {ped.estado === "pendiente" && (
          <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
            <h2 className="font-semibold mb-2">Cómo pagar</h2>
            <p className="text-sm text-neutral-600 whitespace-pre-line">
              {aj.instrucciones_pago || "Escríbenos por WhatsApp y te damos los datos para pagar."}
            </p>
            {n && (
              <a href={`https://wa.me/${n}?text=${msg}`} className="block text-center mt-4 rounded-xl bg-esmeralda text-marino font-semibold py-3">
                Enviar comprobante por WhatsApp
              </a>
            )}
            <p className="text-xs text-neutral-500 mt-3">Cuando confirmemos tu pago, tus datos aparecen aquí mismo. Recarga esta página.</p>
          </div>
        )}

        {ped.estado === "entregado" && (
          <div className="rounded-2xl bg-white border border-esmeralda shadow-sm p-5">
            {entregas.length > 0 && <h2 className="font-semibold mb-3 text-marino">Tus claves y cuentas</h2>}
            {hayRecarga && <p className="text-sm font-semibold text-marino mb-2">Tu recarga fue realizada. Si no la ves en tu juego, escríbenos por WhatsApp.</p>}
            {entregas.length === 0 && !hayRecarga && <p className="text-sm font-semibold text-marino mb-2">Tu pedido fue entregado. Te enviamos tu clave o cuenta por WhatsApp. Si no te llegó, escríbenos.</p>}
            <ul className="space-y-2">
              {entregas.map((e) => (
                <li key={e.id} className="rounded-xl bg-neutral-100 px-4 py-3">
                  <p className="text-xs text-neutral-500">{e.nombre}</p>
                  <p className="font-mono text-sm break-all select-all">{descifrar(e.dato)}</p>
                  {e.instrucciones && <p className="text-xs text-neutral-600 mt-2 whitespace-pre-line">{e.instrucciones}</p>}
                </li>
              ))}
            </ul>
            {entregas.length > 0 && <p className="text-xs text-neutral-500 mt-3">Mantén presionado para copiar. No compartas este enlace con nadie.</p>}
          </div>
        )}

        {ped.estado === "cancelado" && (
          <p className="text-sm text-neutral-500 text-center">Este pedido fue cancelado. Si fue un error, escríbenos por WhatsApp.</p>
        )}
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
