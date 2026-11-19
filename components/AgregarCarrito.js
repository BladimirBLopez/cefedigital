"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { leerCarrito, guardarCarrito } from "./carritoLocal";
import { textoModalidad, modalidadVieja } from "@/lib/modalidades";
import { diasDe, textoDuracion } from "@/lib/duracion";

const MAX_ITEMS = 10;
function textoPlan(plan) {
  const n = Number(plan.pantallas) || 1;
  return [
    n > 1 ? `${n} pantallas` : "",
    textoDuracion(diasDe(plan)),
    textoModalidad(plan.modalidad || modalidadVieja(plan.compartida)),
  ].filter(Boolean).join(" · ");
}

export default function AgregarCarrito({ producto, planes }) {
  const router = useRouter();

  function agregar(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const cont = btn.form || btn.closest("[data-opciones]");
    const f = new FormData(btn.form || undefined);
    if (!btn.form && cont) {
      cont.querySelectorAll("input[name], select[name], textarea[name]").forEach((el) => {
        if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
        f.set(el.name, el.value);
      });
    }
    const hayPlanes = planes.length > 0;
    let plan = null;
    if (hayPlanes) {
      plan = planes.find((x) => String(x.id) === String(f.get("plan_id") || ""));
      if (!plan) return toast.error("Elige un plan para continuar");
    }
    const dato = String(f.get("dato_cliente") || "").trim();
    if (producto.esRecarga && producto.campo_cliente && !dato) {
      return toast.error(`Falta: ${producto.campo_cliente}`);
    }
    const cantidad = hayPlanes ? 1 : Math.min(5, Math.max(1, Number(f.get("cantidad")) || 1));
    const items = leerCarrito();
    const planId = plan ? Number(plan.id) : null;
    const igual = items.find(
      (i) => Number(i.producto_id) === producto.id && (i.plan_id || null) === planId && (i.dato_cliente || "") === dato
    );
    if (igual) {
      if (plan) return toast.error("Ese plan ya está en tu carrito");
      igual.cantidad = Math.min(5, igual.cantidad + cantidad);
    } else {
      if (items.length >= MAX_ITEMS) return toast.error(`Máximo ${MAX_ITEMS} productos por carrito`);
      items.push({
        producto_id: producto.id,
        slug: producto.slug,
        nombre: producto.nombre,
        imagen: producto.imagen || null,
        plan_id: planId,
        plan_texto: plan
          ? textoPlan(plan)
          : null,
        precio: plan ? plan.precio : producto.precio,
        cantidad,
        dato_cliente: dato,
      });
    }
    guardarCarrito(items);
    toast.success("Agregado al carrito", { action: { label: "Ver carrito", onClick: () => router.push("/carrito") } });
  }

  return (
    <button type="submit" onClick={agregar} className="w-full rounded-xl border border-intenso text-intenso hover:bg-intenso/10 font-semibold py-3 transition">
      Agregar al carrito
    </button>
  );
}
