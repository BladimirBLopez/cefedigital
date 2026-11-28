"use client";

import { useEffect, useState } from "react";
import {
  textoModalidad,
  modalidadVieja
} from "@/lib/modalidades";
import {
  diasDe,
  textoDuracion
} from "@/lib/duracion";
import {
  FiCheckCircle,
  FiClock,
  FiMonitor
} from "react-icons/fi";
import { textoCaracteristicas } from "@/lib/caracteristicas-plan";

function descripcionPlan(plan, mostrarPantallas) {
  const modalidad = textoModalidad(
    plan.modalidad || modalidadVieja(plan.compartida)
  );

  const n = Number(plan.pantallas) || 1;
  const partes = [];

  if (modalidad) partes.push(modalidad);

  if (mostrarPantallas) {
    partes.push(`${n} ${n === 1 ? "pantalla" : "pantallas"}`);
  }

  return partes.join(" · ") || "Plan estándar";
}

export default function SelectorPlan({ planes = [] }) {
  const [duracion, setDuracion] = useState(planes.length === 1 ? String(diasDe(planes[0])) : "");
  const [planId, setPlanId] = useState(planes.length === 1 ? String(planes[0].id) : "");

  const duraciones = [
    ...new Set(
      planes.map(diasDe).filter(
        d => Number.isFinite(d) && d > 0
      )
    )
  ].sort((a, b) => a - b);

  const disponibles = planes.filter(
    p => String(diasDe(p)) === duracion
  );

  const seleccionado = planes.find(
    p => String(p.id) === planId
  );

  const mostrarPantallas = planes.some(
    p => Number(p.pantallas) > 1
  );

  const unico = planes.length === 1;

    const precioDesde = (d) => {
      const ps = planes
        .filter((p) => diasDe(p) === d)
        .map((p) => Number(p.precio))
        .filter(Number.isFinite);
      return ps.length ? Math.min(...ps) : null;
    };
    const variasOpciones = (d) => planes.filter((p) => diasDe(p) === d).length > 1;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("cefe:seleccion-plan", {
        detail: { planId: planId || null }
      })
    );
  }, [planId]);

  function elegirDuracion(dias) {
    setDuracion(String(dias));
    setPlanId("");
  }

  function elegirPlan(plan) {
    setDuracion(String(diasDe(plan)));
    setPlanId(String(plan.id));
  }

  if (!planes.length) {
    return (
      <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
        No hay planes disponibles en este momento.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <input
        type="hidden"
        name="plan_id"
        value={planId}
      />

      {unico ? (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-marino">
            Selecciona tu plan
          </h3>

          <button
            type="button"
            aria-pressed={Boolean(planId)}
            onClick={() => elegirPlan(planes[0])}
            className={
              "w-full rounded-2xl border-2 p-4 text-left transition " +
              (planId
                ? "border-intenso bg-intenso/5"
                : "border-neutral-200 bg-white hover:border-intenso")
            }
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold text-marino">
                <FiClock className="text-intenso" />
                {textoDuracion(diasDe(planes[0]))}
              </span>

              <FiCheckCircle
                className={
                  planId
                    ? "h-6 w-6 text-intenso"
                    : "h-6 w-6 text-neutral-300"
                }
              />
            </div>

            <p className="mt-2 text-sm text-neutral-600">
              {descripcionPlan(planes[0], mostrarPantallas)}
            </p>
            {textoCaracteristicas(planes[0], false) && (
              <p className="mt-1 text-xs text-neutral-500">
                {textoCaracteristicas(planes[0], false)}
              </p>
            )}

            <p className="mt-3 text-xl font-extrabold text-intenso">
              Bs {Number(planes[0].precio).toFixed(2)}
            </p>

            <p className="mt-2 text-xs font-medium text-neutral-500">
              {planId
                ? "Plan seleccionado"
                : "Toca para seleccionar este plan"}
            </p>
          </button>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-marino">
              1. Selecciona la duración
              <span className="ml-1 text-red-600">*</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {duraciones.map(d => {
                const activo = duracion === String(d);

                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => elegirDuracion(d)}
                    className={
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition " +
                      (activo
                        ? "border-intenso bg-intenso text-white"
                        : "border-neutral-200 bg-white text-marino hover:border-intenso")
                    }
                  >
                    <FiClock className="h-4 w-4" />
                    <span className="flex flex-col items-start leading-tight">
                        <span>{textoDuracion(d)}</span>
                        {precioDesde(d) !== null && (
                          <span className="text-xs font-bold opacity-80">
                            {variasOpciones(d) ? "Desde " : ""}Bs {precioDesde(d).toFixed(2)}
                          </span>
                        )}
                      </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-marino">
              2. Selecciona el tipo de acceso
              <span className="ml-1 text-red-600">*</span>
            </h3>

            {!duracion ? (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
                Primero selecciona una duración.
              </p>
            ) : (
              <div className="space-y-2">
                {disponibles.map(plan => {
                  const activo = planId === String(plan.id);

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => elegirPlan(plan)}
                      className={
                        "flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition " +
                        (activo
                          ? "border-intenso bg-intenso/5"
                          : "border-neutral-200 bg-white hover:border-intenso")
                      }
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-marino">
                          <FiMonitor className="shrink-0 text-intenso" />
                          {descripcionPlan(plan, mostrarPantallas)}
                        </p>
                        {textoCaracteristicas(plan, false) && (
                          <p className="mt-1 text-xs text-neutral-500">
                            {textoCaracteristicas(plan, false)}
                          </p>
                        )}

                        <p className="mt-2 text-lg font-extrabold text-intenso">
                          Bs {Number(plan.precio).toFixed(2)}
                        </p>
                      </div>

                      <FiCheckCircle
                        className={
                          "h-6 w-6 shrink-0 " +
                          (activo
                            ? "text-intenso"
                            : "text-neutral-300")
                        }
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <section
        aria-live="polite"
        className="rounded-2xl border border-intenso/15 bg-intenso/5 p-4"
      >
        <p className="text-xs font-medium text-neutral-500">
          Total de tu selección
        </p>

        {seleccionado ? (
          <>
            <p className="mt-1 text-sm font-semibold text-marino">
              {descripcionPlan(seleccionado, mostrarPantallas)}
              {" · "}
              {textoDuracion(diasDe(seleccionado))}
            </p>
            {textoCaracteristicas(seleccionado, false) && (
              <p className="mt-1 text-xs text-neutral-500">
                {textoCaracteristicas(seleccionado, false)}
              </p>
            )}

            <p className="mt-2 text-2xl font-extrabold text-intenso">
              Bs {Number(seleccionado.precio).toFixed(2)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm font-semibold text-neutral-500">
            Selecciona tu plan para continuar.
          </p>
        )}
      </section>
    </div>
  );
}
