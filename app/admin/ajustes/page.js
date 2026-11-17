import { requireAdmin } from "@/lib/auth";
import { obtenerAjustes } from "@/lib/ajustes";
import AdminNav from "@/components/AdminNav";
import { guardarAjustes } from "../acciones-pedidos";

export const dynamic = "force-dynamic";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

export default async function Ajustes({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const a = await obtenerAjustes();
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Ajustes de la tienda</h1>
        <form action={guardarAjustes} className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
          <label className="block text-xs text-neutral-500">Nombre de la tienda</label>
          <input name="nombre_tienda" defaultValue={a.nombre_tienda} className={campo} />
          <label className="block text-xs text-neutral-500">WhatsApp de ventas (con código de país, ej: 59171234567)</label>
          <input name="whatsapp" defaultValue={a.whatsapp} inputMode="tel" className={campo} />
          <label className="block text-xs text-neutral-500">Cómo pagar (lo ve el cliente en su pedido)</label>
          <textarea
            name="instrucciones_pago"
            rows={5}
            defaultValue={a.instrucciones_pago}
            placeholder={"Ej: Paga por QR o transferencia a la cuenta ...\nEnvía tu comprobante por WhatsApp."}
            className={campo}
          />
          {sp?.ok && <p className="text-sm text-marino">Guardado</p>}
          <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Guardar ajustes</button>
        </form>
      </main>
    </>
  );
}
