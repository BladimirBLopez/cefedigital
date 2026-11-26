
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { obtenerAjustes, limpiarWhatsapp } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import VaciarCarrito from "@/components/VaciarCarrito";
import PagoPedido from "@/components/PagoPedido";
import { FiMessageCircle } from "react-icons/fi";
import { asegurarEsquema } from "@/lib/esquema";
import { textoCaracteristicas } from "@/lib/caracteristicas-plan";
import { textoDuracion } from "@/lib/duracion";
import { obtenerComprasStreamZone } from "@/lib/comprar-streamzone";

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
  await asegurarEsquema();
  const aj = await obtenerAjustes();

  const [ped] = await sql`
    select p.id, p.codigo, p.total::float as total, p.estado, p.avisado_en, c.nombre
    from pedidos p
    join clientes c on c.id = p.cliente_id
    where p.codigo = ${String(codigo).toUpperCase()}`;

  if (!ped) notFound();

  const items = await sql`
    select pi.cantidad, pi.dato_cliente, pi.plan_nombre,
           pi.plan_compartida, pi.plan_pantallas, pi.plan_perfiles,
           pi.plan_dispositivos, pi.plan_calidad,
           pi.duracion_dias, pi.vence_en, pr.tipo, pr.proveedor, pr.nombre
    from pedido_items pi
    join productos pr on pr.id = pi.producto_id
    where pi.pedido_id = ${ped.id}`;

  const hayStreamZone = items.some((i) => i.proveedor === "streamzone");

  const comprasStreamZone =
    hayStreamZone && ["pagado", "entregado"].includes(ped.estado)
      ? await obtenerComprasStreamZone(ped.id)
      : [];


  const hayRecarga = items.some((i) => i.tipo === "recarga");
  const n = limpiarWhatsapp(aj.whatsapp);

  const msgPago = encodeURIComponent(
    `Hola, hice el pedido ${ped.codigo} por Bs ${ped.total.toFixed(2)}. Te envío mi comprobante de pago.`
  );

  const caracteristicasItem = (i) => textoCaracteristicas({
    pantallas: i.plan_pantallas,
    perfiles: i.plan_perfiles,
    dispositivos: i.plan_dispositivos,
    calidad: i.plan_calidad,
  }, false);

  const lineas = items
    .map((i) => {
      const caracteristicas = caracteristicasItem(i);
      return `${i.cantidad} x ${i.nombre}${i.plan_nombre ? " · " + i.plan_nombre : ""}${caracteristicas ? " · " + caracteristicas : ""}${i.dato_cliente ? " [ID: " + i.dato_cliente + "]" : ""}`;
    })
    .join("\n");
  const msgComprobante = encodeURIComponent(
    `Hola, mi pago del pedido ${ped.codigo} fue confirmado. Quiero coordinar la entrega.\n\n${lineas}\n\nTotal: Bs ${ped.total.toFixed(2)}`
  );

  const msgAyuda = encodeURIComponent(
    `Hola, necesito ayuda con mi pedido ${ped.codigo}.`
  );

  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />

      <main data-pedido="v2" className="mx-auto max-w-3xl px-4 py-6 space-y-4">
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
                {i.plan_compartida !== null && i.plan_compartida !== undefined &&
                  !String(i.plan_nombre || "").includes(i.plan_compartida ? "Perfil compartido" : "Cuenta completa") && (
                    <span className="text-xs text-neutral-500">
                      {" · "}{i.plan_compartida ? "Perfil compartido" : "Cuenta completa"}
                    </span>
                  )}
                {caracteristicasItem(i) && (
                  <span className="block text-xs text-neutral-500">
                    {caracteristicasItem(i)}
                  </span>
                )}
                {i.duracion_dias > 0 && (
                  <span className="block text-xs text-neutral-500">
                    Duración contratada: {textoDuracion(i.duracion_dias)}
                  </span>
                )}
                {i.vence_en && (
                  <span className="block text-xs font-medium text-neutral-600">
                    Fecha de vencimiento: {new Date(i.vence_en).toLocaleDateString("es-BO", {
                      timeZone: "America/La_Paz"
                    })}
                  </span>
                )}
                {i.dato_cliente && <span className="font-mono text-xs text-neutral-500"> [ID: {i.dato_cliente}]</span>}
              </li>
            ))}
          </ul>

        {hayStreamZone && ["pagado", "entregado"].includes(ped.estado) && (
          <section className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
            <h2 className="font-semibold text-marino">Credenciales de tu servicio</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Guarda estos datos y no compartas tus credenciales con otras personas.
            </p>
            {comprasStreamZone.length === 0 && (
              <p className="text-sm text-neutral-500 mt-3">
                Estamos preparando la entrega de tus credenciales.
              </p>
            )}
            <div className="space-y-3 mt-3">
              {comprasStreamZone.map((compra) => (
                <div key={compra.pedido_item_id} className="border border-neutral-200 rounded-xl p-3">
                  <p className="font-medium text-sm">{compra.producto}</p>
                  {compra.estado === "completado" && !compra.errorLectura ? (
                    <div className="space-y-3 mt-3">
                      {compra.credenciales.map((credencial, indice) => (
                        <div key={indice} className="bg-neutral-50 rounded-lg p-3 space-y-2 text-sm">
                          {credencial.email && <p>Usuario: <span className="font-mono break-all">{credencial.email}</span></p>}
                          {credencial.password && <p>Contraseña: <span className="font-mono break-all">{credencial.password}</span></p>}
                          {credencial.profile && <p>Perfil: <b>{credencial.profile}</b></p>}
                          {credencial.pin && <p>PIN: <b className="font-mono">{credencial.pin}</b></p>}
                          {credencial.expiresAt && !Number.isNaN(Date.parse(credencial.expiresAt)) && (
                            <p className="text-xs text-neutral-500">
                              Vencimiento: {new Date(credencial.expiresAt).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500 mt-2">
                      {compra.errorLectura
                        ? "No se pudieron leer las credenciales. Contacta con soporte."
                        : compra.estado === "error"
                          ? "La entrega necesita revisión. Estamos trabajando para solucionarla."
                          : "Estamos procesando tu compra y preparando las credenciales."}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {n && (
              <a href={`https://wa.me/${n}?text=${msgAyuda}`} className="block text-center mt-3 rounded-xl border border-neutral-300 py-3 text-sm font-semibold">
                Contactar soporte
              </a>
            )}
          </section>
        )}


          <p className="text-xl font-bold text-intenso mt-4">
            Total: Bs {ped.total.toFixed(2)}
          </p>

          <p className="text-xs text-neutral-500 mt-2">
            Guarda este código: con él puedes ver tu pedido cuando quieras.
          </p>
        </div>

        {ped.estado === "pendiente" && (
          <PagoPedido
            codigo={ped.codigo}
            total={ped.total}
            whatsapp={n}
            titular={aj.titular_pago || ""}
            instrucciones={aj.instrucciones_pago || ""}
            avisado={Boolean(ped.avisado_en)}
          />
        )}

        {ped.estado === "pagado" && (
          <div className="rounded-2xl bg-esmeralda/15 border border-esmeralda shadow-sm p-5">
            <p className="text-sm font-semibold text-marino">
              Pago confirmado. Ahora coordinamos tu entrega por WhatsApp.
            </p>
            {n && (
              <a
                href={`https://wa.me/${n}?text=${msgComprobante}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-esmeralda py-3 font-semibold text-marino"
              >
                <FiMessageCircle className="h-5 w-5" />
                Coordinar entrega por WhatsApp
              </a>
            )}
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
