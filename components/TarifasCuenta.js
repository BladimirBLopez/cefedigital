"use client";

import { useState } from "react";
import SelectorModalidad from "@/components/SelectorModalidad";
import { textoDuracion } from "@/lib/duracion";
import { CALIDADES } from "@/lib/caracteristicas-plan";

const PANT = [1, 2, 3, 4, 5, 6, 7, 8];

const campo =
  "h-11 w-full min-w-0 rounded-lg bg-neutral-100 border border-neutral-300 px-2 text-sm outline-none focus:border-intenso";

const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

const cols = "grid grid-cols-[4.5rem_1fr_1fr_1.5rem] gap-2 items-center";

export default function TarifasCuenta() {
  const [filas, setFilas] = useState([
    {
      id: 1,
      pant: 1,
      dias: "30",
      precio: "",
      costo: "",
      modalidad: "",
      perfiles: "1",
      dispositivos: "",
      calidad: ""
    }
  ]);

  const [verCostos, setVerCostos] = useState(false);

  const cambiar = (id, k, v) =>
    setFilas(fs => fs.map(f =>
      f.id === id ? { ...f, [k]: v } : f
    ));

  const quitar = id =>
    setFilas(fs => fs.length > 1 ? fs.filter(f => f.id !== id) : fs);

  const agregar = () =>
    setFilas(fs => {
      const u = fs[fs.length - 1];

      return [...fs, {
        ...u,
        id: Date.now(),
        dias: "30",
        precio: "",
        costo: ""
      }];
    });

  const cuenta = {};

  filas.forEach(f => {
    const c = `${f.pant}-${f.dias}-${f.modalidad}`;
    cuenta[c] = (cuenta[c] || 0) + 1;
  });

  const repetida = f =>
    cuenta[`${f.pant}-${f.dias}-${f.modalidad}`] > 1;

  const precios = filas.map(f => num(f.precio)).filter(n => n !== null);
  const minimo = precios.length ? Math.min(...precios) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-marino">Planes y precios</p>
        <button type="button" onClick={() => setVerCostos(v => !v)}
          className="text-xs text-intenso">
          {verCostos ? "Ocultar costos" : "+ Costos"}
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Las pantallas indican reproducciones simultáneas, no dispositivos registrados.
      </p>

      <div className={cols + " text-[11px] text-neutral-500"}>
        <span>Simult.</span>
        <span>Días</span>
        <span>Precio (Bs)</span>
        <span></span>
      </div>

      {filas.map(f => (
        <div key={f.id} className="space-y-2 border-b border-neutral-100 pb-3">
          <div className={cols}>
            <select
              name="plan_pant"
              value={f.pant}
              onChange={e => cambiar(f.id, "pant", Number(e.target.value))}
              aria-label="Pantallas simultáneas"
              className={campo + (repetida(f) ? " !border-red-400" : "")}
            >
              {PANT.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <input
              name="plan_dias"
              inputMode="numeric"
              value={f.dias}
              onChange={e => cambiar(f.id, "dias", e.target.value.replace(/\D/g, "").slice(0, 4))}
              aria-label="Duración en días"
              className={campo + (repetida(f) ? " !border-red-400" : "")}
            />

            <input
              name="plan_precio"
              inputMode="decimal"
              value={f.precio}
              onChange={e => cambiar(f.id, "precio", e.target.value)}
              placeholder="0"
              aria-label="Precio"
              className={campo}
            />

            {filas.length > 1 ? (
              <button type="button" onClick={() => quitar(f.id)}
                aria-label="Quitar plan" className="text-lg text-neutral-400">
                ×
              </button>
            ) : <span />}
          </div>

          <p className="text-[11px] text-neutral-500">
            {textoDuracion(f.dias) || "Ingresa una duración válida."}
          </p>

          <SelectorModalidad
            name="plan_modalidad"
            value={f.modalidad}
            onChange={v => cambiar(f.id, "modalidad", v)}
            compact
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-neutral-500">
              Perfiles incluidos
              <input
                name="plan_perfiles"
                type="number"
                min="1"
                max="20"
                value={f.perfiles}
                onChange={e => cambiar(f.id, "perfiles", e.target.value)}
                className={campo + " mt-1"}
              />
            </label>

            <label className="text-[11px] text-neutral-500">
              Calidad
              <select
                name="plan_calidad"
                value={f.calidad}
                onChange={e => cambiar(f.id, "calidad", e.target.value)}
                className={campo + " mt-1"}
              >
                <option value="">No especificada</option>
                {CALIDADES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-[11px] text-neutral-500">
            Dispositivos compatibles
            <input
              name="plan_dispositivos"
              value={f.dispositivos}
              onChange={e => cambiar(f.id, "dispositivos", e.target.value)}
              maxLength={300}
              placeholder="Smart TV, Android, iPhone, PC..."
              className={campo + " mt-1"}
            />
          </label>

          <input
            name="plan_costo"
            inputMode="decimal"
            value={f.costo}
            onChange={e => cambiar(f.id, "costo", e.target.value)}
            placeholder="Cuánto te cuesta (opcional)"
            aria-label="Costo"
            className={campo + (verCostos ? "" : " hidden")}
          />
        </div>
      ))}

      {filas.some(repetida) && (
        <p className="text-xs text-red-600">
          Tienes un plan repetido con la misma modalidad, pantallas y duración.
        </p>
      )}

      <button type="button" onClick={agregar}
        className="w-full rounded-lg border border-dashed border-intenso py-2 text-sm text-intenso">
        + Agregar plan
      </button>
    </div>
  );
}
