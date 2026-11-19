"use client";

import { useState } from "react";
import { MODALIDADES } from "@/lib/modalidades";
import { textoDuracion } from "@/lib/duracion";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const DURACIONES = [3, 7, 14, 15, 30, 40, 45, 60, 90, 120, 180, 270, 365, 730];

export default function FormPlan({ action, productoId }) {
  const [pant, setPant] = useState(1);
  const [dias, setDias] = useState(30);
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [modalidad, setModalidad] = useState("completa");

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
        Modalidad de la cuenta
        <select name="modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={campo + " mt-1"}>
          {MODALIDADES.map(([v, tx]) => (
            <option key={v || "ninguna"} value={v}>{tx}</option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-neutral-500">
        Dispositivos o pantallas
        <select name="pantallas" value={pant} onChange={(e) => setPant(Number(e.target.value))} className={campo + " mt-1"}>
          {rango(1, 10).map((n) => <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>)}
        </select>
      </label>

      <label className="block text-xs text-neutral-500">
        Duración del servicio
        <select name="duracion_dias" value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo + " mt-1"}>
          {DURACIONES.map((n) => (
            <option key={n} value={n}>{textoDuracion(n)}</option>
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
        <p className="font-semibold text-marino">{pant} {pant === 1 ? "pantalla" : "pantallas"} · {textoDuracion(dias)} de servicio</p>
        <p className="text-xs text-neutral-500">Vence a los {dias} días de entregar.</p>
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
