"use client";

import { useState, useTransition } from "react";
import { cambiarActivo } from "@/app/admin/actions";

export default function Interruptor({ id, activo }) {
  const [on, setOn] = useState(activo);
  const [pendiente, empezar] = useTransition();

  function alternar() {
    const nuevo = !on;
    setOn(nuevo);
    const fd = new FormData();
    fd.set("id", String(id));
    empezar(async () => {
      try {
        await cambiarActivo(fd);
      } catch {
        setOn(!nuevo);
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "A la venta" : "Oculto"}
      onClick={alternar}
      disabled={pendiente}
      className={
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors " +
        (on ? "bg-esmeralda" : "bg-neutral-300") +
        (pendiente ? " opacity-60" : "")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-6" : "translate-x-1")
        }
      />
    </button>
  );
}
