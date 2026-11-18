"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cambiarActivo } from "@/app/admin/actions";

export default function Interruptor({ id, activo }) {
  const [on, setOn] = useState(activo);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState("");

  function alternar() {
    const anterior = on;
    const nuevo = !on;

    setOn(nuevo);
    setError("");

    const fd = new FormData();
    fd.set("id", String(id));

    empezar(async () => {
      try {
        const resultado = await cambiarActivo(fd);

        if (!resultado?.ok) {
          throw new Error("No se pudo cambiar el estado");
        }

        setOn(resultado.activo);

        toast.success(
          resultado.activo
            ? "Producto publicado correctamente."
            : "Producto ocultado correctamente."
        );
      } catch {
        setOn(anterior);
        setError("No se pudo actualizar el estado del producto.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {error && (
        <p role="alert" className="max-w-[160px] text-right text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
