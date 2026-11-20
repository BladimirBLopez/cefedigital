"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FiStar } from "react-icons/fi";
import { cambiarDestacado } from "@/app/admin/actions";

export default function EstrellaDestacado({ id, destacado }) {
  const [on, setOn] = useState(!!destacado);
  const [pendiente, empezar] = useTransition();

  function alternar() {
    const anterior = on;
    setOn(!anterior);
    const fd = new FormData();
    fd.set("id", String(id));
    empezar(async () => {
      try {
        const r = await cambiarDestacado(fd);
        if (!r?.ok) throw new Error("fallo");
        setOn(r.destacado);
        toast.success(r.destacado ? "Agregado a Destacados." : "Quitado de Destacados.", { id: "producto_destacado" });
      } catch {
        setOn(anterior);
        toast.error("No se pudo cambiar Destacado.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendiente}
      aria-pressed={on}
      aria-label={on ? "Quitar de Destacados" : "Marcar como Destacado"}
      className={"rounded-full border p-1.5 transition " + (on ? "border-amber-400 bg-amber-50 text-amber-500" : "border-neutral-300 text-neutral-400 hover:text-amber-500") + (pendiente ? " opacity-60" : "")}
    >
      <FiStar className="h-4 w-4" fill={on ? "currentColor" : "none"} />
    </button>
  );
}
