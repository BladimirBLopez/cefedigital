"use client";

import { borrarProducto } from "@/app/admin/acciones-productos";

export default function BorrarProducto({ id, nombre, className = "" }) {
  return (
    <form
      action={borrarProducto}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar "${nombre}" para siempre? No se puede deshacer.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className={
          "text-xs rounded-full px-3 py-1 border border-red-300 text-red-600 hover:bg-red-50 " + className
        }
      >
        Borrar
      </button>
    </form>
  );
}
