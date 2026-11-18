"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const mes = (n) => `${n} ${n === 1 ? "mes" : "meses"}`;

export default function SelectorPlan({ planes }) {
  const durs = [];
  for (const p of planes) {
    const k = `${p.meses_pagados}-${p.meses_gratis}`;
    if (!durs.find((d) => d.k === k)) durs.push({ k, pag: p.meses_pagados, gra: p.meses_gratis });
  }
  durs.sort((a, b) => a.pag + a.gra - (b.pag + b.gra));

  const [dk, setDk] = useState(durs[0].k);
  const [pant, setPant] = useState("");

  const delDur = planes.filter((p) => `${p.meses_pagados}-${p.meses_gratis}` === dk);
  const disp = delDur.map((p) => p.pantallas).sort((a, b) => a - b);
  const pantOk = disp.includes(Number(pant)) ? Number(pant) : disp[0];
  const plan = delDur.find((p) => p.pantallas === pantOk);
  const d = durs.find((x) => x.k === dk);
  const total = d.pag + d.gra;

  return (
    <div className="space-y-3">
      <input type="hidden" name="plan_id" value={plan ? plan.id : ""} />
      <label className="block text-xs font-medium text-neutral-500">
        Duración
        <select value={dk} onChange={(e) => setDk(e.target.value)} className={campo + " mt-1"}>
          {durs.map((x) => (
            <option key={x.k} value={x.k}>{mes(x.pag)}{x.gra > 0 ? ` + ${x.gra} gratis` : ""}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-neutral-500">
        Dispositivos
        <select value={pantOk} onChange={(e) => setPant(e.target.value)} className={campo + " mt-1"}>
          {disp.map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>
          ))}
        </select>
      </label>
      {plan && (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <p className="text-xs text-neutral-500">Tu elección</p>
          <p className="text-sm font-semibold text-marino">
            {pantOk} {pantOk === 1 ? "pantalla" : "pantallas"} · {mes(total)} de servicio
          </p>
          <p className="text-2xl font-bold text-intenso mt-1">Total: Bs {plan.precio.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
