"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { FiMinus, FiPlus, FiTrash2, FiShoppingCart, FiZap, FiShield, FiMessageCircle } from "react-icons/fi";
import { crearPedidoCarrito } from "@/app/tienda-actions";
import { leerCarrito, guardarCarrito } from "./carritoLocal";
import { optimizar } from "@/lib/imagen";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";

const ERRORES = {
  vacio: "Tu carrito está vacío.",
  datos: "Revisa tu número de WhatsApp.",
  invalido: "Algún producto ya no está disponible. Quítalo o vacía el carrito y vuelve a intentar.",
  dato: "Falta un dato de cuenta en uno de los productos.",
  limite: "Hiciste muchos pedidos seguidos. Espera un rato o escríbenos por WhatsApp.",
  fallo: "No pudimos crear tu pedido. Intenta otra vez.",
};

function Enviar({ total }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-3 rounded-b-2xl border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur">
      <div className="leading-tight">
        <p className="text-[11px] text-neutral-500">Total</p>
        <p className="text-xl font-bold text-intenso">Bs {total.toFixed(2)}</p>
      </div>
      <button disabled={pending} className="flex-1 rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3 transition disabled:opacity-60">
        {pending ? "Enviando pedido..." : "Hacer pedido"}
      </button>
    </div>
  );
}

export default function CarritoCliente({ error }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(leerCarrito());
  }, []);
  const cambiar = (nuevos) => {
    setItems(nuevos);
    guardarCarrito(nuevos);
  };
  const setCant = (k, n) => cambiar(items.map((x, j) => (j === k ? { ...x, cantidad: Math.min(5, Math.max(1, n)) } : x)));

  if (items === null) return <p className="mt-6 text-sm text-neutral-500">Cargando...</p>;

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-8 text-center">
        <FiShoppingCart className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-3 font-semibold text-marino">Tu carrito está vacío</p>
        <p className="text-sm text-neutral-500 mt-1">Agrega productos para hacer tu pedido.</p>
        <Link href="/" className="inline-block mt-4 rounded-xl bg-intenso hover:bg-marino text-white font-semibold px-5 py-2.5 transition">Ver productos</Link>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  const payload = items.map((i) => ({ producto_id: i.producto_id, plan_id: i.plan_id || null, cantidad: i.cantidad, dato_cliente: i.dato_cliente || "" }));

  return (
    <>
      <p className="text-sm text-neutral-500 mt-1">
        {unidades} {unidades === 1 ? "producto" : "productos"} ·{" "}
        <Link href="/" className="font-medium text-intenso">Seguir comprando</Link>
      </p>

      <ul className="mt-4 space-y-3">
        {items.map((i, k) => (
          <li key={k} className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-3 flex gap-3">
            {i.imagen ? (
              <img src={optimizar(i.imagen, 200)} alt={i.nombre} loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-intenso/10 to-turquesa/20" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/producto/${i.slug}`} className="font-semibold text-marino leading-snug">{i.nombre}</Link>
                <button type="button" aria-label="Quitar" onClick={() => cambiar(items.filter((_, j) => j !== k))} className="p-1 text-neutral-400 hover:text-red-600">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
              {i.plan_texto && <p className="text-xs text-neutral-500 mt-0.5">{i.plan_texto}</p>}
              {i.dato_cliente && <p className="text-xs font-mono text-neutral-500 break-all">{i.dato_cliente}</p>}
              <div className="flex items-end justify-between mt-2">
                {!i.plan_id ? (
                  <div className="inline-flex items-center rounded-xl border border-neutral-300">
                    <button type="button" aria-label="Menos" disabled={i.cantidad <= 1} onClick={() => setCant(k, i.cantidad - 1)} className="p-2 disabled:opacity-30">
                      <FiMinus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{i.cantidad}</span>
                    <button type="button" aria-label="Más" disabled={i.cantidad >= 5} onClick={() => setCant(k, i.cantidad + 1)} className="p-2 disabled:opacity-30">
                      <FiPlus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">1 plan</span>
                )}
                <div className="text-right">
                  {i.cantidad > 1 && <p className="text-[11px] text-neutral-400">Bs {i.precio.toFixed(2)} c/u</p>}
                  <p className="font-bold text-intenso">Bs {(i.precio * i.cantidad).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>


      <form action={crearPedidoCarrito} className="mt-5 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 space-y-3">
        <input type="hidden" name="items" value={JSON.stringify(payload)} />
        <div>
          <label className="block text-xs text-neutral-500">
            Tu WhatsApp (opcional, para avisarte cuando venza tu servicio)
            <input name="cliente_whatsapp" type="tel" minLength={8} maxLength={15} inputMode="tel" autoComplete="tel" placeholder="Ej. 71234567" className={campo + " mt-1"} />
          </label>
        </div>
        <p className="text-xs text-neutral-500">Al hacer el pedido te damos un código y las instrucciones de pago. El total final se confirma al crear el pedido.</p>
        {error && <p className="text-sm text-red-600">{ERRORES[error] || ERRORES.fallo}</p>}
        <button type="button" onClick={() => { if (window.confirm("¿Vaciar el carrito?")) cambiar([]); }} className="w-full text-xs text-neutral-500">Vaciar carrito</button>
        <Enviar total={total} />
      </form>
    </>
  );
}
