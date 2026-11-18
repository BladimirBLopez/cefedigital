"use client";

import { useState } from "react";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-intenso";
const MESES = [1, 2, 3, 6, 12];
const num = (v) => {
  const n = Number(String(v).replace(",", "."));
  return String(v).trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export default function TarifasCuenta() {
  const [filas, setFilas] = useState([{ id: 1, pant: 1, precio: "", costo: "" }]);
  const [meses, setMeses] = useState([1, 3, 6, 12]);

  const cambiar = (id, k, v) => setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const agregar = () =>
    setFilas((fs) => {
      const usadas = fs.map((f) => f.pant);
      const sig = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((n) => !usadas.includes(n)) || 1;
      return [...fs, { id: Date.now(), pant: sig, precio: "", costo: "" }];
    });
  const quitar = (id) => setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : fs));
  const alternar = (m) => setMeses((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m].sort((a, b) => a - b)));

  const precios = filas.map((f) => num(f.precio)).filter((n) => n !== null);
  const minimo = precios.length ? Math.min(...precios) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-esmeralda p-3">
      <input type="hidden" name="precio" value={minimo} />
      <p className="text-sm font-semibold text-marino">Precio por mes según dispositivos</p>

      {filas.map((f) => (
        <div key={f.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-2">
          <label className="block text-xs text-neutral-500">
            Dispositivos o pantallas
            <select name="pantallas" value={f.pant} onChange={(e) => cambiar(f.id, "pant", Number(e.target.value))} className={campo + " mt-1"}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "pantalla" : "pantallas"}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-neutral-500">
              Precio por mes (Bs)
              <input name="precio_mes" required inputMode="decimal" value={f.precio} onChange={(e) => cambiar(f.id, "precio", e.target.value)} placeholder="20" className={campo + " mt-1"} />
            </label>
            <label className="block text-xs text-neutral-500">
              Te cuesta por mes (opcional)
              <input name="costo_mes" inputMode="decimal" value={f.costo} onChange={(e) => cambiar(f.id, "costo", e.target.value)} placeholder="14" className={campo + " mt-1"} />
            </label>
          </div>
          {filas.length > 1 && (
            <button type="button" onClick={() => quitar(f.id)} className="text-xs text-red-600">Quitar esta opción</button>
          )}
        </div>
      ))}

      <button type="button" onClick={agregar} className="w-full rounded-xl border border-intenso text-intenso font-semibold py-2 text-sm">
        + Agregar otra opción de dispositivos
      </button>

      <div>
        <p className="text-xs text-neutral-500 mb-1.5">Duraciones que vendes</p>
        <div className="flex flex-wrap gap-2">
          {MESES.map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="checkbox" name="meses" value={m} checked={meses.includes(m)} onChange={() => alternar(m)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-sm peer-checked:bg-intenso peer-checked:text-white peer-checked:border-intenso">
                {m} {m === 1 ? "mes" : "meses"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white border border-neutral-200 p-3 text-sm space-y-2">
        <p className="text-xs text-neutral-500">Así lo verá el cliente</p>
        {filas.map((f) => {
          const p = num(f.precio);
          return (
            <div key={f.id}>
              <p className="font-semibold text-marino">{f.pant} {f.pant === 1 ? "pantalla" : "pantallas"}</p>
              {p === null ? (
                <p className="text-xs text-neutral-500">Escribe el precio por mes.</p>
              ) : (
                <p className="text-xs text-neutral-600">
                  {meses.length === 0 ? "Marca al menos una duración." : meses.map((m) => `${m} ${m === 1 ? "mes" : "meses"}: Bs ${(p * m).toFixed(2)}`).join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
