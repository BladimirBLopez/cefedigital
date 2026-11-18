"use client";

import { useState } from "react";

const PANT = [1, 2, 3, 4, 5, 6, 7, 8];
const MESES = [1, 2, 3, 6, 12];
const campo =
  "h-11 w-full min-w-0 rounded-lg bg-neutral-100 border border-neutral-300 px-2 text-sm outline-none focus:border-intenso";
const etq = (m) => `${m} ${m === 1 ? "mes" : "meses"}`;
const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};
const cols = "grid grid-cols-[4.5rem_1fr_1fr_1.5rem] gap-2 items-center";

export default function TarifasCuenta() {
  const [filas, setFilas] = useState([{ id: 1, pant: 1, meses: 1, precio: "", costo: "" }]);
  const [verCostos, setVerCostos] = useState(false);

  const cambiar = (id, k, v) => setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const quitar = (id) => setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : fs));
  const agregar = () =>
    setFilas((fs) => {
      const u = fs[fs.length - 1];
      const sig = MESES[MESES.indexOf(u.meses) + 1];
      const nueva = sig
        ? { pant: u.pant, meses: sig }
        : { pant: Math.min(u.pant + 1, PANT[PANT.length - 1]), meses: 1 };
      return [...fs, { id: Date.now(), ...nueva, precio: "", costo: "" }];
    });

  const cuenta = {};
  filas.forEach((f) => {
    const c = `${f.pant}-${f.meses}`;
    cuenta[c] = (cuenta[c] || 0) + 1;
  });
  const repetida = (f) => cuenta[`${f.pant}-${f.meses}`] > 1;
  const precios = filas.map((f) => num(f.precio)).filter((n) => n !== null);
  const minimo = precios.length ? Math.min(...precios) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-marino">Planes y precios</p>
        <button type="button" onClick={() => setVerCostos((v) => !v)} className="text-xs text-intenso">
          {verCostos ? "Ocultar costos" : "+ Costos"}
        </button>
      </div>

      <div className={cols + " text-[11px] text-neutral-500"}>
        <span>Pantallas</span>
        <span>Duración</span>
        <span>Precio (Bs)</span>
        <span></span>
      </div>

      {filas.map((f) => (
        <div key={f.id} className="space-y-2">
          <div className={cols}>
            <select
              name="plan_pant"
              value={f.pant}
              onChange={(e) => cambiar(f.id, "pant", Number(e.target.value))}
              aria-label="Pantallas"
              className={campo + (repetida(f) ? " !border-red-400" : "")}
            >
              {PANT.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              name="plan_meses"
              value={f.meses}
              onChange={(e) => cambiar(f.id, "meses", Number(e.target.value))}
              aria-label="Duración"
              className={campo + (repetida(f) ? " !border-red-400" : "")}
            >
              {MESES.map((m) => (
                <option key={m} value={m}>{etq(m)}</option>
              ))}
            </select>
            <input
              name="plan_precio"
              inputMode="decimal"
              value={f.precio}
              onChange={(e) => cambiar(f.id, "precio", e.target.value)}
              placeholder="0"
              aria-label="Precio en Bs"
              className={campo}
            />
            {filas.length > 1 ? (
              <button
                type="button"
                onClick={() => quitar(f.id)}
                aria-label="Quitar plan"
                className="text-lg leading-none text-neutral-400 hover:text-red-600"
              >
                ×
              </button>
            ) : (
              <span></span>
            )}
          </div>
          <input
            name="plan_costo"
            inputMode="decimal"
            value={f.costo}
            onChange={(e) => cambiar(f.id, "costo", e.target.value)}
            placeholder="Cuánto te cuesta (opcional)"
            aria-label="Costo"
            className={campo + (verCostos ? "" : " hidden")}
          />
        </div>
      ))}

      {filas.some(repetida) && <p className="text-xs text-red-600">Tienes un plan repetido. Cambia uno.</p>}

      <button
        type="button"
        onClick={agregar}
        className="w-full rounded-lg border border-dashed border-intenso py-2 text-sm text-intenso"
      >
        + Agregar plan
      </button>
    </div>
  );
}
