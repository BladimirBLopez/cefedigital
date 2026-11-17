import Link from "next/link";
import { salir } from "@/app/admin/actions";

export default function AdminNav() {
  const link = "px-3 py-2 rounded-lg text-sm text-marino hover:bg-neutral-100 whitespace-nowrap";
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-marino">Cefe Digital</span>
        <form action={salir}>
          <button className="text-xs text-neutral-600 border border-neutral-300 rounded-full px-3 py-1">Salir</button>
        </form>
      </div>
      <nav className="mx-auto max-w-2xl flex gap-1 px-3 pb-2 overflow-x-auto">
        <Link className={link} href="/admin">Resumen</Link>
        <Link className={link} href="/admin/productos">Productos</Link>
        <Link className={link} href="/admin/stock">Claves y cuentas</Link>
        <Link className={link} href="/admin/pedidos">Pedidos</Link>
        <Link className={link} href="/admin/ajustes">Ajustes</Link>
      </nav>
    </header>
  );
}
