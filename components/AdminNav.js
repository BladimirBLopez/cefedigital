"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiClock,
  FiSettings,
  FiMenu,
  FiX,
  FiExternalLink,
  FiLogOut,
  FiLink,
} from "react-icons/fi";
import { salir } from "@/app/admin/actions";

const GRUPOS = [
  { titulo: null, enlaces: [{ href: "/admin", texto: "Inicio", icono: FiHome, exacto: true }] },
  { titulo: "Catálogo", enlaces: [{ href: "/admin/productos", texto: "Productos", icono: FiPackage }, { href: "/admin/juegos", texto: "Juegos", icono: FiPackage }] },
  {
    titulo: "Ventas",
    enlaces: [
      { href: "/admin/pedidos", texto: "Pedidos", icono: FiShoppingBag },
      { href: "/admin/vencimientos", texto: "Vencimientos", icono: FiClock },
    ],
  },
  { titulo: "Proveedores", enlaces: [{ href: "/admin/proveedores/streamzone", texto: "StreamZone", icono: FiLink }, { href: "/admin/proveedores/central-one", texto: "Central One", icono: FiLink }] },
  { titulo: "Sistema", enlaces: [{ href: "/admin/ajustes", texto: "Ajustes", icono: FiSettings }] },
];
const TODOS = GRUPOS.flatMap((g) => g.enlaces);

export default function AdminNav() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  const esActivo = (e) => (e.exacto ? ruta === e.href : ruta.startsWith(e.href));
  const actual = TODOS.find(esActivo)?.texto || "Admin";

  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <>
      <header className="sticky top-0 z-20 bg-marino text-white shadow">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            className="-ml-2 rounded-lg p-2 hover:bg-white/10"
          >
            <FiMenu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{actual}</p>
            <p className="text-[11px] leading-tight text-white/60">Cefe Digital · Admin</p>
          </div>
        </div>
      </header>

      <div
        onClick={() => setAbierto(false)}
        aria-hidden="true"
        className={
          "fixed inset-0 z-40 bg-black/50 transition-opacity " +
          (abierto ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      <aside
        aria-hidden={!abierto}
        className={
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-marino text-white shadow-xl transition-transform duration-200 " +
          (abierto ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="font-semibold leading-tight">Cefe Digital</p>
            <p className="text-[11px] leading-tight text-white/60">Panel de administración</p>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {GRUPOS.map((g, i) => (
            <div key={i}>
              {g.titulo && (
                <p className="px-3 pb-1 pt-4 text-[11px] uppercase tracking-wider text-white/50">{g.titulo}</p>
              )}
              {g.enlaces.map((e) => {
                const activo = esActivo(e);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    onClick={() => setAbierto(false)}
                    aria-current={activo ? "page" : undefined}
                    className={
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm " +
                      (activo ? "bg-white font-semibold text-marino" : "text-white/85 hover:bg-white/10")
                    }
                  >
                    <e.icono className="h-5 w-5" />
                    {e.texto}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/85 hover:bg-white/10"
          >
            <FiExternalLink className="h-5 w-5" />
            Ver tienda
          </Link>
          <form action={salir}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/85 hover:bg-white/10">
              <FiLogOut className="h-5 w-5" />
              Salir
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
