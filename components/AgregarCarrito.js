"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  leerCarrito,
  guardarCarrito
} from "./carritoLocal";
import {
  textoModalidad,
  modalidadVieja
} from "@/lib/modalidades";
import {
  diasDe,
  textoDuracion
} from "@/lib/duracion";
import { FiShoppingCart } from "react-icons/fi";
import { textoCaracteristicas } from "@/lib/caracteristicas-plan";

const MAX_ITEMS = 10;

function textoPlan(plan) {
  const n = Number(plan.pantallas) || 1;

  return [
    textoModalidad(
      plan.modalidad ||
      modalidadVieja(plan.compartida)
    ),
    n > 1 ? `${n} pantallas` : "",
    textoDuracion(diasDe(plan)),
    textoCaracteristicas(plan, false)
  ].filter(Boolean).join(" · ");
}

export default function AgregarCarrito({
  producto,
  planes = []
}) {
  const [planId, setPlanId] = useState(planes.length === 1 ? String(planes[0].id) : "");

  const hayPlanes = planes.length > 0;

  useEffect(() => {
    setPlanId(planes.length === 1 ? String(planes[0].id) : "");

    const alSeleccionar = (evento) => {
      setPlanId(
        String(evento.detail?.planId || "")
      );
    };

    window.addEventListener(
      "cefe:seleccion-plan",
      alSeleccionar
    );

    return () => {
      window.removeEventListener(
        "cefe:seleccion-plan",
        alSeleccionar
      );
    };
  }, [producto.id]);

  const planSeleccionado = planes.find(
    p => String(p.id) === planId
  );

  const habilitado = !hayPlanes || Boolean(planSeleccionado);
    const precioBoton = Number(planSeleccionado ? planSeleccionado.precio : producto.precio);

  function agregar(e) {
    e.preventDefault();

    if (!habilitado) {
      toast.error("Primero selecciona un plan");
      return;
    }

    const boton = e.currentTarget;
    const contenedor =
      boton.form ||
      boton.closest("[data-opciones]") ||
      document.querySelector("[data-opciones]");

    const form = new FormData();

    if (contenedor) {
      contenedor
        .querySelectorAll(
          "input[name], select[name], textarea[name]"
        )
        .forEach(el => {
          if (
            (el.type === "radio" ||
              el.type === "checkbox") &&
            !el.checked
          ) return;

          form.set(el.name, el.value);
        });
    }

    const id = String(form.get("plan_id") || "");

    let plan = null;

    if (hayPlanes) {
      plan = planes.find(
        p => String(p.id) === id && id === planId
      );

      if (!plan) {
        toast.error("Selecciona un plan válido");
        return;
      }
    }

    let dato = String(
      form.get("dato_cliente") || ""
    ).trim();

    const camposCo = Array.isArray(producto.campos_co)
      ? producto.campos_co
      : [];

    if (camposCo.length > 0) {
      const objeto = {};

      for (const c of camposCo) {
        const valor = String(form.get("co_" + c.key) || "").trim();

        if (!valor) {
          toast.error("Falta: " + c.label);
          return;
        }

        objeto[c.key] = valor;
      }

      dato = JSON.stringify(objeto);
    }

    if (
      producto.esRecarga &&
      producto.campo_cliente &&
      !dato
    ) {
      toast.error(
        `Falta: ${producto.campo_cliente}`
      );
      return;
    }

    const cantidad = hayPlanes
      ? 1
      : Math.min(
          5,
          Math.max(
            1,
            Number(form.get("cantidad")) || 1
          )
        );

    const precio = Number(
      plan ? plan.precio : producto.precio
    );

    if (!Number.isFinite(precio) || precio < 0) {
      toast.error("Precio no disponible");
      return;
    }

    const items = leerCarrito();

    const idPlan = plan
      ? Number(plan.id)
      : null;

    const igual = items.find(
      i =>
        Number(i.producto_id) === Number(producto.id) &&
        (i.plan_id || null) === idPlan &&
        (i.dato_cliente || "") === dato
    );

    let cantidadEsperada = cantidad;

    if (igual) {
      if (plan) {
        toast.error(
          "Este plan ya está en tu carrito"
        );
        window.dispatchEvent(
          new Event("carrito:abrir")
        );
        return;
      }

      const actual = Number(igual.cantidad) || 1;

      if (actual + cantidad > 5) {
        toast.error("Máximo 5 unidades por producto");
        return;
      }

      igual.cantidad = actual + cantidad;
      igual.precio = precio;
      cantidadEsperada = igual.cantidad;
    } else {
      if (items.length >= MAX_ITEMS) {
        toast.error(
          `Máximo ${MAX_ITEMS} productos por carrito`
        );
        return;
      }

      items.push({
        producto_id: Number(producto.id),
        slug: producto.slug,
        nombre: producto.nombre,
        imagen: producto.imagen || null,
        plan_id: idPlan,
        plan_texto: plan
          ? textoPlan(plan)
          : null,
        precio,
        cantidad,
        dato_cliente: dato,
        dato_texto: (() => {
          const cs = Array.isArray(producto.campos_co) ? producto.campos_co : [];
          if (cs.length === 0) return null;
          try {
            const o = JSON.parse(dato);
            return cs
              .map((c) => {
                const op = (c.options || []).find((x) => x.value === o[c.key]);
                return c.label + ": " + (op ? op.label : o[c.key]);
              })
              .join(" · ");
          } catch {
            return null;
          }
        })()
      });
    }

    guardarCarrito(items);

    const guardados = leerCarrito();

    const guardado = guardados.find(
      i =>
        Number(i.producto_id) === Number(producto.id) &&
        (i.plan_id || null) === idPlan &&
        (i.dato_cliente || "") === dato
    );

    if (
      !guardado ||
      Number(guardado.cantidad) !== cantidadEsperada
    ) {
      toast.error("No se pudo guardar el carrito");
      return;
    }

    window.dispatchEvent(
      new Event("carrito:abrir")
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={agregar}
        disabled={!habilitado}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition " +
          (habilitado
            ? "bg-intenso text-white hover:bg-marino"
            : "cursor-not-allowed bg-neutral-200 text-neutral-500")
        }
      >
        <FiShoppingCart className="h-5 w-5" />

        {habilitado
          ? (Number.isFinite(precioBoton) ? `Agregar · Bs ${precioBoton.toFixed(2)}` : "Agregar al carrito")
          : "Selecciona tu plan"}
      </button>

      {!habilitado && (
        <p className="text-center text-xs text-neutral-500">
          Elige una opción para continuar.
        </p>
      )}
    </div>
  );
}
