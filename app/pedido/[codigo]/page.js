
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes, limpiarWhatsapp } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import VaciarCarrito from "@/components/VaciarCarrito";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const ESTADOS = {
  pendiente: "Esperando tu pago",
  pagado: "Pago recibido",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default async function Pedido({ params, searchParams }) {
  const { codigo } = await params;
  const sp = await searchParams;
  const aj = await obtenerAjustes();

  const [ped] = await sql`
    select p.id, p.codigo, p.total::float as total, p.estado, c.nombre
    from pedidos p
    join clientes c on c.id = p.cliente_id
    where p.codigo = ${String(codigo).toUpperCase()}`;

  if (!ped) notFound();

  const items = await sql`
    select pi.cantidad, pi.dato_cliente, pi.plan_nombre, pr.tipo, pr.nombre
    from pedido_items pi
    join productos pr on pr.id = pi.producto_id
    where pi.pedido_id = ${ped.id}`;

  const hayRecarga = items.some((i) => i.tipo === "recarga");
  const n = limpiarWhatsapp(aj.whatsapp);

  const msgPago = encodeURIComponent(
    `Hola, hice el pedido ${ped.codigo} por Bs ${ped.total.toFixed(2)}. Te envío mi comprobante de pago.`
  );

  const msgAyuda = encodeURIComponent(
    `Hola, necesito ayuda con mi pedido ${ped.codigo}.`
  );

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {sp?.nuevo && <VaciarCarrito />}

        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          <p className="text-xs text-neutral-500">Tu pedido</p>
          <p className="text-2xl font-bold font-mono text-intenso tracking-wider">{ped.codigo}</p>

          <p className="text-sm mt-2">
            Estado: <b className="text-marino">{ESTADOS[ped.estado] || ped.estado}</b>
          </p>

          {ped.estado !== "cancelado" && (
            <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
              {["Pedido hecho", "Pago confirmado", "Entregado"].map((txt, i) => {
                const paso = ped.estado === "entregado" ? 3 : ped.estado === "pagado" ? 2 : 1;
                const ok = i < paso;

                return (
                  <li key={txt} className={"rounded-xl border py-2 " + (ok ? "bg-esmeralda/20 border-esmeralda text-marino" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
                    {ok ? "✓ " : ""}{txt}
                  </li>
                );
              })}
            </ol>
          )}

          <ul className="text-sm text-neutral-600 mt-3 space-y-1">
            {items.map((i, k) => (
              <li key={k}>
                {i.cantidad} x {i.nombre}
                {i.plan_nombre && <span className="text-xs text-neutral-500"> · {i.plan_nombre}</span>}
                {i.dato_cliente && <span className="font-mono text-xs text-neutral-500"> [ID: {i.dato_cliente}]</span>}
              </li>
            ))}
          </ul>

          <p className="text-xl font-bold text-intenso mt-4">
            Total: Bs {ped.total.toFixed(2)}
          </p>

          <p className="text-xs text-neutral-500 mt-2">
            Guarda este código: con él puedes ver tu pedido cuando quieras.
          </p>
        </div>

        {ped.estado === "pendiente" && (
          <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
            <h2 className="text-lg font-bold mb-2">Cómo pagar</h2>

            <p className="text-sm text-neutral-600 whitespace-pre-line">
              {aj.instrucciones_pago || "Escríbenos por WhatsApp y te damos los datos para pagar."}
            </p>

            {n && (
              <a href={`https://wa.me/${n}?text=${msgPago}`} className="block text-center mt-4 rounded-xl bg-esmeralda hover:brightness-95 transition text-marino font-semibold py-3">
                Enviar comprobante por WhatsApp
              </a>
            )}

            <p className="text-xs text-neutral-500 mt-3">
              Cuando confirmemos tu pago, coordinaremos la entrega por WhatsApp. Guarda tu código.
            </p>
          </div>
        )}

        {ped.estado === "entregado" && (
          <div className="rounded-2xl bg-white border border-esmeralda shadow-sm p-5">
            {hayRecarga ? (
              <p className="text-sm font-semibold text-marino">
                Tu recarga fue realizada. Si no la ves en tu juego, escríbenos por WhatsApp.
              </p>
            ) : (
              <p className="text-sm font-semibold text-marino">
                Tu pedido fue marcado como entregado. La entrega se coordinó manualmente por WhatsApp.
              </p>
            )}

            {n && (
              <a href={`https://wa.me/${n}?text=${msgAyuda}`} className="block text-center mt-4 rounded-xl bg-esmeralda text-marino font-semibold py-3">
                Contactar por WhatsApp
              </a>
            )}
          </div>
        )}

        {ped.estado === "cancelado" && (
          <p className="text-sm text-neutral-500 text-center">
            Este pedido fue cancelado. Si fue un error, escríbenos por WhatsApp.
          </p>
        )}
      </main>

      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
