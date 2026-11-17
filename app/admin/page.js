import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

function Tarjeta({ titulo, valor }) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className="text-2xl font-semibold mt-1">{valor}</p>
    </div>
  );
}

export default async function Resumen() {
  await requireAdmin();
  const [r] = await sql`
    select
      (select count(*)::int from productos where activo) as productos,
      (select count(*)::int from stock where estado = 'disponible') as stock,
      (select count(*)::int from pedidos where estado = 'pendiente') as pendientes,
      (select coalesce(sum(total), 0)::float from pedidos where estado in ('pagado','entregado')) as ventas`;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Resumen</h1>
        <div className="grid grid-cols-2 gap-3">
          <Tarjeta titulo="Productos a la venta" valor={r.productos} />
          <Tarjeta titulo="Claves y cuentas disponibles" valor={r.stock} />
          <Tarjeta titulo="Pedidos por confirmar" valor={r.pendientes} />
          <Tarjeta titulo="Ventas cobradas (Bs)" valor={r.ventas.toFixed(2)} />
        </div>
      </main>
    </>
  );
}
