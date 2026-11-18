"use client";

import { useState } from "react";
import TarifasCuenta from "@/components/TarifasCuenta";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

export default function CamposProducto({ tipo = "clave", campoCliente = "", duracion = "", conPlan = false, sinDuracion = false }) {
  const [t, setT] = useState(tipo || "clave");
  const [precio, setPrecio] = useState("");
  return (
    <>
      <label className="block text-xs text-neutral-500">
        Forma de entrega
        <select name="tipo" value={t} onChange={(e) => setT(e.target.value)} className={campo + " mt-1"}>
        <option value="clave">Clave o licencia</option>
        <option value="cuenta">Cuenta con planes</option>
        <option value="recarga">Recarga con ID</option>
      </select>
      </label>
      {t === "cuenta" && !conPlan && !sinDuracion && (
        <input name="duracion_dias" inputMode="numeric" defaultValue={duracion || ""} placeholder="Duración en días (ej: 30)" className={campo} />
      )}
      {t === "cuenta" && sinDuracion && <input type="hidden" name="duracion_dias" value={duracion || ""} />}
      {t === "recarga" && (
        <input name="campo_cliente" defaultValue={campoCliente || ""} placeholder="Dato que pides al cliente (ej: Tu ID de jugador)" className={campo} />
      )}
      {conPlan && t === "cuenta" && <TarifasCuenta />}
      {conPlan && t !== "cuenta" && (
        <input name="precio" required inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio en Bs" className={campo} />
      )}
    </>
  );
}
