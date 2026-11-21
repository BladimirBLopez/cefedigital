"use client";

import { useState } from "react";
import { textoModalidad, modalidadVieja } from "@/lib/modalidades";
import { diasDe, textoDuracion } from "@/lib/duracion";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const ORDEN = ["completa", "compartida", "tu_correo", "mi_correo", "bajo_pedido", ""];
const clave = (p) => p.modalidad || modalidadVieja(p.compartida);
const pantDe = (p) => Number(p.pantallas) || 1;
const pantTxt = (n) => `${n} ${n === 1 ? "pantalla" : "pantallas"}`;
const tipoDe = (p) => `${clave(p)}|${pantDe(p)}`;
const texto = (t) => [textoModalidad(t.m), t.n > 1 ? pantTxt(t.n) : ""].filter(Boolean).join(" · ");

export default function SelectorPlan({ planes }) {
  const tipos = [];
  for (const p of planes) {
    const k = tipoDe(p);
    if (!tipos.some((t) => t.k === k)) tipos.push({ k, m: clave(p), n: pantDe(p) });
  }
  tipos.sort((a, b) => ORDEN.indexOf(a.m) - ORDEN.indexOf(b.m) || a.n - b.n);

  const [tk, setTk] = useState("");
  const [dk, setDk] = useState("");

  const tipo = tipos.find((t) => t.k === tk) || tipos[0];
  if (!tipo) return null;

  const disponibles = planes.filter((p) => tipoDe(p) === tipo.k);
  const durs = [...new Set(disponibles.map(diasDe))].filter(Number.isFinite).sort((a, b) => a - b);
  const duracion = durs.some((d) => String(d) === dk) ? dk : String(durs[0] ?? "");
  const plan = disponibles.find((p) => String(diasDe(p)) === duracion);

  return (
    <div className="space-y-3">
      <input type="hidden" name="plan_id" value={plan ? plan.id : ""} />

      {tipos.length > 1 ? (
        <label className="block text-xs font-medium text-neutral-500">
          Tipo de acceso
          <select value={tipo.k} onChange={(e) => setTk(e.target.value)} className={campo + " mt-1"}>
            {tipos.map((t) => (
              <option key={t.k} value={t.k}>{texto(t) || "Estándar"}</option>
            ))}
          </select>
        </label>
      ) : (
        texto(tipo) && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Tipo de acceso</p>
            <p className="text-sm font-semibold text-marino mt-1">{texto(tipo)}</p>
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

      {plan && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">Tu elección</p>
          <p className="text-sm font-semibold text-marino">
            {[texto(tipo), `${textoDuracion(Number(duracion))} de servicio`].filter(Boolean).join(" · ")}
          </p>
          <p className="text-2xl font-bold text-intenso mt-1">
            Total: Bs {plan.precio.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
