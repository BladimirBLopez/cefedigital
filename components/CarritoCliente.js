"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { crearPedidoCarrito } from "@/app/tienda-actions";
import { leerCarrito, guardarCarrito } from "./carritoLocal";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";

const ERRORES = {
  vacio: "Tu carrito está vacío.",
  datos: "Revisa tu nombre y tu número de WhatsApp.",
  invalido: "Algún producto ya no está disponible. Quítalo o vacía el carrito y vuelve a intentar.",
  dato: "Falta un dato de cuenta en uno de los productos.",
  limite: "Hiciste muchos pedidos seguidos. Espera un rato o escríbenos por WhatsApp.",
  fallo: "No pudimos crear tu pedido. Intenta otra vez.",
};

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3 transition disabled:opacity-60">
      {pending ? "Enviando pedido..." : "Hacer pedido"}
    </button>
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

  if (items === null) return <p className="mt-6 text-sm text-neutral-500">Cargando...</p>;

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-white border border-neutral-200 shadow-sm p-6 text-center">
        <p className="text-neutral-600">Tu carrito está vacío.</p>
        <Link href="/" className="inline-block mt-4 rounded-xl bg-intenso hover:bg-marino text-white font-semibold px-5 py-2.5 transition">Ver productos</Link>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const payload = items.map((i) => ({ producto_id: i.producto_id, plan_id: i.plan_id || null, cantidad: i.cantidad, dato_cliente: i.dato_cliente || "" }));

  return (
    <>
      <ul className="mt-4 space-y-3">
        {items.map((i, k) => (
          <li key={k} className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-3 flex gap-3">
            {i.imagen ? (
              <img src={i.imagen} alt={i.nombre} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-intenso/10 to-turquesa/20" />
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/producto/${i.slug}`} className="font-medium text-marino">{i.nombre}</Link>
              {i.plan_texto && <p className="text-xs text-neutral-500">{i.plan_texto}</p>}
              {i.dato_cliente && <p className="text-xs font-mono text-neutral-500 break-all">{i.dato_cliente}</p>}
              <p className="text-sm font-bold text-intenso mt-1">Bs {(i.precio * i.cantidad).toFixed(2)}</p>
              <div className="flex items-center gap-3 mt-2">
                {!i.plan_id && (
                  <select
                    value={i.cantidad}
                    onChange={(e) => cambiar(items.map((x, j) => (j === k ? { ...x, cantidad: Number(e.target.value) } : x)))}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => cambiar(items.filter((_, j) => j !== k))} className="text-xs text-red-600">Quitar</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form action={crearPedidoCarrito} className="mt-5 rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 space-y-3">
        <input type="hidden" name="items" value={JSON.stringify(payload)} />
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-2xl font-bold text-intenso">Bs {total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-neutral-500">Llena tus datos y te escribimos por WhatsApp cuando confirmemos tu pago. El total final se confirma al crear el pedido.</p>
        <input name="nombre" required maxLength={80} placeholder="Tu nombre" className={campo} />
        <input name="whatsapp" required inputMode="tel" placeholder="Tu WhatsApp (ej: 71234567)" className={campo} />
        {error && <p className="text-sm text-red-600">{ERRORES[error] || ERRORES.fallo}</p>}
        <Enviar />
        <button type="button" onClick={() => cambiar([])} className="w-full text-xs text-neutral-500">Vaciar carrito</button>
      </form>
    </>
  );
}
