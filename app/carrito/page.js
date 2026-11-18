import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import CarritoCliente from "@/components/CarritoCliente";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carrito", robots: { index: false } };

export default async function Carrito({ searchParams }) {
  const sp = await searchParams;
  const aj = await obtenerAjustes();
  return (
    <>
      <TiendaHeader nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Tu carrito</h1>
        <CarritoCliente error={sp?.error ? String(sp.error) : null} />
      </main>
      <TiendaFooter nombre={aj.nombre_tienda} whatsapp={aj.whatsapp} />
    </>
  );
}
