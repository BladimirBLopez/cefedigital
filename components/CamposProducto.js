"use client";

import { useState } from "react";
import TarifasCuenta from "@/components/TarifasCuenta";

const campo = "w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento";

const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export default function CamposProducto({ tipo = "clave", campoCliente = "", duracion = "", conPlan = false }) {
  const [t, setT] = useState(tipo || "clave");
  const [pant, setPant] = useState(1);
  const [pag, setPag] = useState(1);
  const [gra, setGra] = useState(0);
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  return (
    <>
      <label className="block text-xs text-neutral-500">
        ¿Qué vendes?
        <select name="tipo" value={t} onChange={(e) => setT(e.target.value)} className={campo + " mt-1"}>
          <option value="clave">Clave o licencia (Windows, Office, antivirus)</option>
          <option value="cuenta">Cuenta de streaming (Netflix, Disney, Spotify)</option>
          <option value="recarga">Recarga de juego (Free Fire, el cliente pone su ID)</option>
        </select>
      </label>
      {t === "cuenta" && !conPlan && (
        <label className="block text-xs text-neutral-500">
          Duración del servicio en días
          <input name="duracion_dias" inputMode="numeric" defaultValue={duracion || ""} placeholder="30" className={campo + " mt-1"} />
          <span className="block mt-1">Con esto el panel te avisa cuándo vence cada cuenta.</span>
        </label>
      )}
      {t === "recarga" && (
        <label className="block text-xs text-neutral-500">
          ¿Qué dato le pides al cliente?
          <input name="campo_cliente" defaultValue={campoCliente || ""} placeholder="Tu ID de jugador" className={campo + " mt-1"} />
          <span className="block mt-1">Le aparece en el formulario cuando hace su pedido.</span>
        </label>
      )}

      {conPlan && t === "cuenta" && <TarifasCuenta />}
      {conPlan && t !== "cuenta" && (
        <label className="block text-xs text-neutral-500">
          Precio en Bs
          <input name="precio" required inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio en Bs" className={campo + " mt-1"} />
        </label>
      )}
    </>
  );
}
