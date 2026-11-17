"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiPackage, FiShoppingBag, FiClock, FiSettings } from "react-icons/fi";
import { salir } from "@/app/admin/actions";

const ENLACES = [
  { href: "/admin", texto: "Inicio", icono: FiHome, exacto: true },
  { href: "/admin/productos", texto: "Productos", icono: FiPackage },
  { href: "/admin/pedidos", texto: "Pedidos", icono: FiShoppingBag },
  { href: "/admin/vencimientos", texto: "Vencimientos", icono: FiClock },
  { href: "/admin/ajustes", texto: "Ajustes", icono: FiSettings },
];

export default function AdminNav() {
  const ruta = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-marino text-white shadow">
      <div className="mx-auto max-w-3xl px-4 pt-3 flex items-center justify-between">
        <span className="font-semibold tracking-tight">
          Cefe Digital <span className="text-white/60 font-normal">· Admin</span>
        </span>
        <form action={salir}>
          <button className="text-xs rounded-full border border-white/30 px-3 py-1 hover:bg-white/10">Salir</button>
        </form>
      </div>
      <nav className="mx-auto max-w-3xl px-4 py-2 flex gap-2 overflow-x-auto">
        {ENLACES.map((e) => {
          const activo = e.exacto ? ruta === e.href : ruta.startsWith(e.href);
          return (
            <Link
              key={e.href}
              href={e.href}
              className={
                "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm " +
                (activo ? "bg-white text-marino font-semibold" : "text-white/80 hover:bg-white/10")
              }
            >
              <e.icono className="h-4 w-4" />{e.texto}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
