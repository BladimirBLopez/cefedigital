"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiMinus, FiPlus, FiTrash2, FiShoppingCart, FiX } from "react-icons/fi";
import { leerCarrito, guardarCarrito } from "./carritoLocal";
import { optimizar } from "@/lib/imagen";

export default function CarritoPanel() {
  const [abierto, setAbierto] = useState(false);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);
  const pathname = usePathname();

  const cerrar = () => {
    setVisible(false);
    setTimeout(() => setAbierto(false), 200);
  };

  useEffect(() => {
    const alAbrir = () => {
      setItems(leerCarrito());
      setAbierto(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    };
    const alCambiar = () => setItems(leerCarrito());
    window.addEventListener("carrito:abrir", alAbrir);
    window.addEventListener("carrito:cambio", alCambiar);
    return () => {
      window.removeEventListener("carrito:abrir", alAbrir);
      window.removeEventListener("carrito:cambio", alCambiar);
    };
  }, []);

  useEffect(() => {
    setVisible(false);
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [abierto]);

  if (!abierto) return null;

  const cambiar = (nuevos) => {
    setItems(nuevos);
    guardarCarrito(nuevos);
  };
  const setCant = (k, n) => cambiar(items.map((x, j) => (j === k ? { ...x, cantidad: Math.min(5, Math.max(1, n)) } : x)));
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const unidades = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu carrito">
      <div onClick={cerrar} className={"absolute inset-0 bg-black/40 transition-opacity duration-200 " + (visible ? "opacity-100" : "opacity-0")} />
      <div
        className={
          "absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-200 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem] sm:rounded-none " +
          (visible ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full")
        }
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="font-bold text-marino">Tu carrito{unidades > 0 ? ` (${unidades})` : ""}</h2>
          <button type="button" aria-label="Cerrar" onClick={cerrar} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <FiShoppingCart className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 font-semibold text-marino">Tu carrito está vacío</p>
            <button type="button" onClick={cerrar} className="mt-4 rounded-xl bg-intenso hover:bg-marino px-5 py-2.5 text-sm font-semibold text-white transition">
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto px-4">
              {items.map((i, k) => (
                <li key={k} className="flex gap-3 py-3">
                  {i.imagen ? (
                    <img src={optimizar(i.imagen, 160)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-intenso/10 to-turquesa/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/producto/${i.slug}`} className="text-sm font-semibold leading-snug text-marino">{i.nombre}</Link>
                      <button type="button" aria-label="Quitar" onClick={() => cambiar(items.filter((_, j) => j !== k))} className="p-1 text-neutral-400 hover:text-red-600">
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {i.plan_texto && <p className="text-xs text-neutral-500">{i.plan_texto}</p>}
                    <div className="mt-1.5 flex items-center justify-between">
                      {!i.plan_id ? (
                        <div className="inline-flex items-center rounded-lg border border-neutral-300">
                          <button type="button" aria-label="Menos" disabled={i.cantidad <= 1} onClick={() => setCant(k, i.cantidad - 1)} className="p-1.5 disabled:opacity-30">
                            <FiMinus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{i.cantidad}</span>
                          <button type="button" aria-label="Más" disabled={i.cantidad >= 5} onClick={() => setCant(k, i.cantidad + 1)} className="p-1.5 disabled:opacity-30">
                            <FiPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">1 plan</span>
                      )}
                      <p className="text-sm font-bold text-intenso">Bs {(i.precio * i.cantidad).toFixed(2)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-neutral-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Total</span>
                <span className="text-xl font-bold text-intenso">Bs {total.toFixed(2)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={cerrar} className="rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-600">
                  Seguir comprando
                </button>
                <Link href="/carrito" className="rounded-xl bg-intenso hover:bg-marino py-3 text-center text-sm font-semibold text-white transition">
                  Finalizar pedido
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
