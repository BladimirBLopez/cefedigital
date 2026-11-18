"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const mes = (n) => `${n} ${n === 1 ? "mes" : "meses"}`;

const valorModalidad = (p) =>
  p.compartida === true ? "true" : p.compartida === false ? "false" : "null";

const textoModalidad = (v) =>
  v === "true" ? "Perfil compartido" :
  v === "false" ? "Cuenta completa" : "Modalidad sin clasificar";

export default function SelectorPlan({ planes }) {
  const modalidades = [...new Set(planes.map(valorModalidad))].sort((a, b) => {
    const orden = { false: 0, true: 1, null: 2 };
    return orden[a] - orden[b];
  });

  const [modalidad, setModalidad] = useState(
    modalidades.includes("false") ? "false" : modalidades[0] ?? "false"
  );
  const [dk, setDk] = useState("");
  const [pant, setPant] = useState("");

  const disponibles = planes.filter((p) => valorModalidad(p) === modalidad);

  const durs = [...new Set(disponibles.map((p) => Number(p.meses_pagados)))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .map((pag) => ({ pag }));

  const duracion = durs.some((d) => String(d.pag) === dk)
    ? dk : String(durs[0]?.pag ?? "");

  const delDur = disponibles.filter(
    (p) => String(p.meses_pagados) === duracion
  );

  const disp = [...new Set(delDur.map((p) => Number(p.pantallas)))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const pantOk = disp.includes(Number(pant)) ? Number(pant) : disp[0];
  const plan = delDur.find((p) => Number(p.pantallas) === pantOk);
  const pag = Number(duracion);

  return (
    <div className="space-y-3">
      <input type="hidden" name="plan_id" value={plan ? plan.id : ""} />

      {modalidades.length > 1 ? (
        <label className="block text-xs font-medium text-neutral-500">
          Modalidad de cuenta
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            className={campo + " mt-1"}
          >
            {modalidades.map((m) => (
              <option key={m} value={m}>{textoModalidad(m)}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">Modalidad de cuenta</p>
          <p className="text-sm font-semibold text-marino mt-1">
            {textoModalidad(modalidad)}
          </p>
        </div>
      )}

      <label className="block text-xs font-medium text-neutral-500">
        Duración
        <select
          value={duracion}
          onChange={(e) => setDk(e.target.value)}
          className={campo + " mt-1"}
        >
          {durs.map((x) => (
            <option key={x.pag} value={x.pag}>{mes(x.pag)}</option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-neutral-500">
        Dispositivos
        <select
          value={pantOk ?? ""}
          onChange={(e) => setPant(e.target.value)}
          className={campo + " mt-1"}
        >
          {disp.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "pantalla" : "pantallas"}
            </option>
          ))}
        </select>
      </label>

      {plan && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">Tu elección</p>
          <p className="text-sm font-semibold text-marino">
            {textoModalidad(valorModalidad(plan))} · {pantOk} {pantOk === 1 ? "pantalla" : "pantallas"} · {mes(pag)} de servicio
          </p>
          <p className="text-2xl font-bold text-intenso mt-1">
            Total: Bs {plan.precio.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
