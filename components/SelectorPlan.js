"use client";

import { useState } from "react";
import { textoModalidad, modalidadVieja } from "@/lib/modalidades";
import { diasDe, textoDuracion } from "@/lib/duracion";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const ORDEN = ["completa", "compartida", "tu_correo", "mi_correo", "bajo_pedido", ""];
const clave = (p) => p.modalidad || modalidadVieja(p.compartida);
const pantDe = (p) => Number(p.pantallas) || 1;
const pantTxt = (n) => `${n} ${n === 1 ? "pantalla" : "pantallas"}`;

export default function SelectorPlan({ planes }) {
  const modalidades = [...new Set(planes.map(clave))].sort(
    (a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b)
  );

  const [modalidad, setModalidad] = useState(modalidades[0] ?? "");
  const [dk, setDk] = useState("");
  const [pant, setPant] = useState("");

  const disponibles = planes.filter((p) => clave(p) === modalidad);
  const durs = [...new Set(disponibles.map(diasDe))].filter(Number.isFinite).sort((a, b) => a - b);
  const duracion = durs.some((d) => String(d) === dk) ? dk : String(durs[0] ?? "");
  const delDur = disponibles.filter((p) => String(diasDe(p)) === duracion);
  const disp = [...new Set(delDur.map(pantDe))].sort((a, b) => a - b);
  const pantOk = disp.includes(Number(pant)) ? Number(pant) : disp[0];
  const plan = delDur.find((p) => pantDe(p) === pantOk);
  const verPant = disp.length > 1;

  return (
    <div className="space-y-3">
      <input type="hidden" name="plan_id" value={plan ? plan.id : ""} />

      {modalidades.length > 1 ? (
        <label className="block text-xs font-medium text-neutral-500">
          Modalidad de cuenta
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={campo + " mt-1"}>
            {modalidades.map((m) => (
              <option key={m || "base"} value={m}>{textoModalidad(m) || "Estándar"}</option>
            ))}
          </select>
        </label>
      ) : (
        textoModalidad(modalidad) && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Modalidad de cuenta</p>
            <p className="text-sm font-semibold text-marino mt-1">{textoModalidad(modalidad)}</p>
          </div>
        )
      )}

      {durs.length > 1 && (
        <label className="block text-xs font-medium text-neutral-500">
          Duración
          <select value={duracion} onChange={(e) => setDk(e.target.value)} className={campo + " mt-1"}>
            {durs.map((d) => (
              <option key={d} value={d}>{textoDuracion(d)}</option>
            ))}
          </select>
        </label>
      )}

      {verPant && (
        <label className="block text-xs font-medium text-neutral-500">
          Dispositivos
          <select value={pantOk ?? ""} onChange={(e) => setPant(e.target.value)} className={campo + " mt-1"}>
            {disp.map((n) => (
              <option key={n} value={n}>{pantTxt(n)}</option>
            ))}
          </select>
        </label>
      )}

      {plan && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">Tu elección</p>
          <p className="text-sm font-semibold text-marino">
            {[
              textoModalidad(clave(plan)),
              verPant || pantOk > 1 ? pantTxt(pantOk) : "",
              `${textoDuracion(Number(duracion))} de servicio`,
            ].filter(Boolean).join(" · ")}
          </p>
          <p className="text-2xl font-bold text-intenso mt-1">
            Total: Bs {plan.precio.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
