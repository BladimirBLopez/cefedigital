import Link from "next/link";
import { salir } from "@/app/admin/actions";

export default function AdminNav() {
  const link = "px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800";
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0d0d0f]/95 backdrop-blur">
      <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-acento">Cefe Digital</span>
        <form action={salir}>
          <button className="text-xs text-neutral-400 border border-neutral-700 rounded-full px-3 py-1">Salir</button>
        </form>
      </div>
      <nav className="mx-auto max-w-2xl flex gap-1 px-3 pb-2">
        <Link className={link} href="/admin">Resumen</Link>
        <Link className={link} href="/admin/productos">Productos</Link>
        <Link className={link} href="/admin/stock">Claves y cuentas</Link>
      </nav>
    </header>
  );
}
