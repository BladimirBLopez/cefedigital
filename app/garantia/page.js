import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Garantía y términos" };

const DIAS = 7;

export default async function Garantia() {
  const aj = await obtenerAjustes();
  const bloque = "rounded-2xl bg-white border border-neutral-200 shadow-sm p-5";
  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Garantía y términos</h1>

        <section className={bloque}>
          <h2 className="font-semibold">Garantía de {DIAS} días</h2>
          <p className="text-sm text-neutral-600 mt-2">
            Si la clave o cuenta que recibiste no funciona, escríbenos por WhatsApp dentro de los {DIAS} días
            después de la entrega. Te la reemplazamos por otra del mismo producto.
          </p>
        </section>

        <section className={bloque}>
          <h2 className="font-semibold">Cómo pedir un reemplazo</h2>
          <ul className="text-sm text-neutral-600 mt-2 space-y-1 list-disc pl-5">
            <li>Escríbenos por WhatsApp con tu código de pedido.</li>
            <li>Cuéntanos qué mensaje de error te sale, o manda una captura.</li>
            <li>Revisamos y te damos una clave nueva si corresponde.</li>
          </ul>
        </section>

        <section className={bloque}>
          <h2 className="font-semibold">Qué no cubre la garantía</h2>
          <ul className="text-sm text-neutral-600 mt-2 space-y-1 list-disc pl-5">
            <li>Claves ya usadas o compartidas con otras personas.</li>
            <li>Errores al activar por no seguir las instrucciones del producto.</li>
            <li>Pedidos pasados de los {DIAS} días de garantía.</li>
          </ul>
        </section>

        <section className={bloque}>
          <h2 className="font-semibold">Términos de compra</h2>
          <ul className="text-sm text-neutral-600 mt-2 space-y-1 list-disc pl-5">
            <li>Los productos son digitales y se entregan después de confirmar tu pago.</li>
            <li>Guarda tu código de pedido: con él ves tus claves cuando quieras.</li>
            <li>No compartas tu enlace de pedido con nadie.</li>
            <li>Por ser productos digitales, no hay devolución de dinero una vez entregados, salvo el reemplazo por falla.</li>
          </ul>
        </section>
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
