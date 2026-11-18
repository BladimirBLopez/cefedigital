"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { leerCarrito } from "./carritoLocal";

export default function BotonCarrito() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const act = () => setN(leerCarrito().reduce((s, i) => s + (Number(i.cantidad) || 0), 0));
    act();
    window.addEventListener("carrito:cambio", act);
    window.addEventListener("storage", act);
    return () => {
      window.removeEventListener("carrito:cambio", act);
      window.removeEventListener("storage", act);
    };
  }, []);
  return (
    <Link href="/carrito" aria-label="Carrito" className="relative rounded-full border border-neutral-300 p-2 text-marino hover:bg-neutral-50">
      <FiShoppingCart className="h-5 w-5" />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-intenso px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{n}</span>
      )}
    </Link>
  );
}
