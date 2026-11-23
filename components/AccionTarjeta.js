"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { FiShoppingCart, FiX } from "react-icons/fi";
import { leerCarrito, guardarCarrito } from "./carritoLocal";
import SelectorPlan from "./SelectorPlan";
import AgregarCarrito from "./AgregarCarrito";

const MAX_ITEMS = 10;

export default function AccionTarjeta({ p }) {
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const cerrar = () => setAbierto(false);

    const tecla = (e) => {
      if (e.key === "Escape") cerrar();
    };

    window.addEventListener("carrito:abrir", cerrar);

    if (abierto) {
      window.addEventListener("keydown", tecla);
    }

    return () => {
      window.removeEventListener("carrito:abrir", cerrar);
      window.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  function agregarSimple(producto) {
    const precio = Number(producto.precio);

    if (
      producto.precio === null ||
      producto.precio === undefined ||
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      toast.error("Este producto no tiene un precio válido");
      return;
    }

    const items = leerCarrito();

    const igual = items.find(
      (i) =>
        Number(i.producto_id) === Number(producto.id) &&
        !i.plan_id &&
        !i.dato_cliente
    );

    if (igual) {
      const cantidad = Number(igual.cantidad) || 1;

      if (cantidad >= 5) {
        toast.error("Máximo 5 unidades de este producto");
        return;
      }

      igual.cantidad = cantidad + 1;
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
    window.dispatchEvent(new Event("carrito:abrir"));
  }

  async function abrirCarrito() {
    if (cargando) return;

    setCargando(true);

    try {
      const respuesta = await fetch(
        "/api/opciones-carrito?slug=" +
          encodeURIComponent(p.slug),
        { cache: "no-store" }
      );

      if (!respuesta.ok) {
        throw new Error("Producto no disponible");
      }

      const info = await respuesta.json();

      if (!info.producto || !Array.isArray(info.planes)) {
        throw new Error("Datos incompletos");
      }

      const producto = info.producto;
      const planes = info.planes;

      const necesitaDato =
        producto.tipo === "recarga" &&
        Boolean(producto.campo_cliente);

      if (planes.length > 0 || necesitaDato) {
        setDatos(info);
        setAbierto(true);
      } else {
        agregarSimple(producto);
      }
    } catch (error) {
      toast.error(
        "No pudimos consultar el producto. Intenta nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirCarrito}
        disabled={cargando}
        aria-label={
          p.con_planes
            ? `Elegir plan de ${p.nombre} y agregar al carrito`
            : `Agregar ${p.nombre} al carrito`
        }
        title={
          p.con_planes
            ? "Elegir plan"
            : "Agregar al carrito"
        }
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:border-cian hover:bg-intenso disabled:opacity-50"
      >
        {cargando ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <FiShoppingCart className="h-5 w-5" />
        )}
      </button>

      {abierto && datos && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Opciones de ${datos.producto.nombre}`}
        >
          <button
            type="button"
            aria-label="Cerrar opciones"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-intenso">
                  Agregar al carrito
                </p>
                <h2 className="mt-1 text-lg font-bold text-marino">
                  {datos.producto.nombre}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div data-opciones className="mt-5 space-y-4">
              {datos.planes.length > 0 && (
                <SelectorPlan planes={datos.planes} />
              )}

              {datos.producto.tipo === "recarga" &&
                datos.producto.campo_cliente && (
                  <label className="block text-sm font-medium text-marino">
                    {datos.producto.campo_cliente}
                    <input
                      type="text"
                      name="dato_cliente"
                      maxLength={100}
                      placeholder={datos.producto.campo_cliente}
                      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-intenso"
                    />
                  </label>
                )}

              <AgregarCarrito
                producto={{
                  id: Number(datos.producto.id),
                  slug: datos.producto.slug,
                  nombre: datos.producto.nombre,
                  imagen: datos.producto.imagen_url,
                  precio: Number(datos.producto.precio),
                  esRecarga: datos.producto.tipo === "recarga",
                  campo_cliente: datos.producto.campo_cliente,
                }}
                planes={datos.planes}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
