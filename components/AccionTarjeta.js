"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiShoppingCart } from "react-icons/fi";
import { leerCarrito, guardarCarrito } from "./carritoLocal";

const MAX_ITEMS = 10;

export default function AccionTarjeta({ p }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  const irAlDetalle = () => {
    router.push(
      "/producto/" + encodeURIComponent(p.slug)
    );
  };

  function agregarSimple(producto) {
    const precio = Number(producto.precio);

    if (
      producto.precio == null ||
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      toast.error("Producto sin precio válido");
      return;
    }

    const items = leerCarrito();

    const igual = items.find(
      (i) =>
        Number(i.producto_id) === Number(producto.id) &&
        i.plan_id == null &&
        !i.dato_cliente
    );

    let cantidadNueva = 1;

    if (igual) {
      cantidadNueva = (Number(igual.cantidad) || 1) + 1;

      if (cantidadNueva > 5) {
        toast.error("Máximo 5 unidades por producto");
        return;
      }

      igual.cantidad = cantidadNueva;
      igual.precio = precio;
    } else {
      if (items.length >= MAX_ITEMS) {
        toast.error("Máximo 10 productos por carrito");
        return;
      }

      items.push({
        producto_id: Number(producto.id),
        slug: producto.slug,
        nombre: producto.nombre,
        imagen: producto.imagen_url || null,
        plan_id: null,
        plan_texto: null,
        precio,
        cantidad: 1,
        dato_cliente: "",
      });
    }

    guardarCarrito(items);

    const guardado = leerCarrito().find(
      (i) =>
        Number(i.producto_id) === Number(producto.id) &&
        i.plan_id == null &&
        !i.dato_cliente
    );

    if (
      !guardado ||
      Number(guardado.cantidad) !== cantidadNueva
    ) {
      toast.error("No se pudo guardar el carrito");
      return;
    }

    window.dispatchEvent(new Event("carrito:abrir"));
  }

  async function agregar() {
    if (cargando) return;

    // Productos con planes: elegir las opciones
    // en la página de detalle.
    if (p.con_planes) {
      irAlDetalle();
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(
        "/api/opciones-carrito?slug=" +
          encodeURIComponent(p.slug),
        { cache: "no-store" }
      );

      if (!respuesta.ok) {
        throw new Error("No disponible");
      }

      const info = await respuesta.json();

      if (
        !info.producto ||
        !Array.isArray(info.planes)
      ) {
        throw new Error("Datos incompletos");
      }

      const producto = info.producto;

      const necesitaDato =
        producto.tipo === "recarga" &&
        Boolean(producto.campo_cliente);

      const pideDatosCo = producto.pide_datos_co === true;

      // Si requiere configuración, abrir detalle.
      if (info.planes.length > 0 || necesitaDato || pideDatosCo) {
        irAlDetalle();
        return;
      }

      // Productos simples: agregar directamente.
      agregarSimple(producto);

    } catch (error) {
      toast.error(
        "No se pudo agregar. Intenta nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={agregar}
      disabled={cargando}
      aria-label={
        p.con_planes
          ? `Elegir plan de ${p.nombre}`
          : `Agregar ${p.nombre} al carrito`
      }
      title={
        p.con_planes
          ? "Elegir plan"
          : "Agregar al carrito"
      }
      className="
        flex h-11 w-11 shrink-0
        items-center justify-center
        rounded-xl border border-white/25
        bg-white/10 text-white
        transition hover:border-cian
        hover:bg-intenso
        disabled:opacity-50
      "
    >
      {cargando ? (
        <span
          className="
            h-5 w-5 animate-spin rounded-full
            border-2 border-white/30
            border-t-white
          "
        />
      ) : (
        <FiShoppingCart className="h-5 w-5" />
      )}
    </button>
  );
}
