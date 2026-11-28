"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cambiarPrecioPaquete } from "@/app/admin/acciones-precios";

export default function PrecioPaquete({ id, precio, costo, sugerido, sinStock }) {
  const [base, setBase] = useState(precio);
  const [txt, setTxt] = useState(String(precio));
  const [pendiente, empezar] = useTransition();
  const n = Number(String(txt).replace(",", "."));
  const valido = Number.isFinite(n) && n > 0;
  const cambio = valido && Math.abs(n - base) > 0.001;
  const gana = valido && costo > 0 ? n - costo : null;

  function guardar(auto) {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("precio", String(auto ? sugerido : n));
    empezar(async () => {
      try {
        const r = await cambiarPrecioPaquete(fd);
        if (!r?.ok) throw new Error("fallo");
        setBase(r.precio);
        setTxt(String(r.precio));
        toast.success("Precio guardado: Bs " + r.precio.toFixed(2), { id: "precio_paquete" });
      } catch {
        toast.error("No se pudo guardar el precio.");
      }
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
      {costo > 0 && <span>Costo {costo.toFixed(2)}</span>}
      <label className="flex items-center gap-1">
        <span>Bs</span>
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          inputMode="decimal"
          className={"w-20 rounded-lg border bg-neutral-100 px-2 py-1 text-xs text-neutral-900 outline-none focus:border-acento " + (valido ? "border-neutral-300" : "border-red-400")}
        />
      </label>
      {gana !== null && (
        <span className={gana >= 0 ? "text-emerald-600" : "text-red-600"}>gana {gana.toFixed(2)}</span>
      )}
      {sinStock && <span className="text-red-600">Sin stock</span>}
      {cambio && (
        <button type="button" disabled={pendiente} onClick={() => guardar(false)} className="rounded-lg bg-intenso px-2 py-1 text-xs font-semibold text-white disabled:opacity-60">
          {pendiente ? "..." : "Guardar"}
        </button>
      )}
      {!cambio && sugerido > 0 && Math.abs(sugerido - base) > 0.001 && (
        <button type="button" disabled={pendiente} onClick={() => guardar(true)} className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-marino disabled:opacity-60">
          Auto {sugerido.toFixed(2)}
        </button>
      )}
    </div>
  );
}
