
"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export default function FormPlan({ action, productoId }) {
  const [pant, setPant] = useState(1);
  const [pag, setPag] = useState(1);
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");

  const p = Number(String(precio).replace(",", "."));
  const c = Number(String(costo).replace(",", "."));
  const ganancia = Number.isFinite(p) && Number.isFinite(c) && precio !== ""
    ? p - (costo === "" ? 0 : c)
    : null;

  return (
    <form action={action} className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
      <input type="hidden" name="producto_id" value={productoId} />
      <h2 className="font-semibold">Agregar plan</h2>

      <label className="block text-xs text-neutral-500">
        Dispositivos o pantallas
        <select name="pantallas" value={pant} onChange={(e) => setPant(Number(e.target.value))} className={campo + " mt-1"}>
          {rango(1, 10).map((n) => <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>)}
        </select>
      </label>

      <label className="block text-xs text-neutral-500">
        Meses de servicio
        <select name="meses_pagados" value={pag} onChange={(e) => setPag(Number(e.target.value))} className={campo + " mt-1"}>
          {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24, 36].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "mes" : "meses"}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-neutral-500">
          Precio al cliente (Bs)
          <input name="precio" required inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="28" className={campo + " mt-1"} />
        </label>
        <label className="block text-xs text-neutral-500">
          Lo que te cuesta (Bs)
          <input name="costo" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="20" className={campo + " mt-1"} />
        </label>
      </div>

      <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm">
        <p className="font-semibold text-marino">{pant} {pant === 1 ? "pantalla" : "pantallas"} · {pag} {pag === 1 ? "mes" : "meses"} de servicio</p>
        <p className="text-xs text-neutral-500">Vence a los {pag * 30} días de entregar.</p>
        {ganancia !== null && (
          <p className={"text-sm font-semibold mt-1 " + (ganancia < 0 ? "text-red-600" : "text-marino")}>
            Ganancia: Bs {ganancia.toFixed(2)}
          </p>
        )}
      </div>

      <button className="w-full rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Agregar plan</button>
    </form>
  );
}
