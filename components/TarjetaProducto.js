import Link from "next/link";
import { optimizar } from "@/lib/imagen";
import { iconoCategoria } from "@/lib/iconosCategoria";
import AccionTarjeta from "./AccionTarjeta";
import { limpiarNombre } from "@/lib/nombre-producto";

export default function TarjetaProducto({ p }) {
  const Icono = iconoCategoria(p.categoria);
  const nombre = limpiarNombre(p.nombre);

  const precio = Number(p.precio);
  const tienePrecio =
    p.precio !== null &&
    p.precio !== undefined &&
    Number.isFinite(precio);

  return (
    <article
      className="
        flex min-w-0 flex-col overflow-hidden
        rounded-2xl border border-intenso/25
        bg-marino shadow-md
        transition-all duration-200
        hover:border-electrico hover:shadow-lg
      "
    >
      {/* IMAGEN */}
      <Link
        href={`/producto/${p.slug}`}
        aria-label={`Ver ${nombre}`}
        className="
          block aspect-[4/3] w-full
          overflow-hidden bg-white
        "
      >
        {p.imagen_url ? (
          <img
            src={optimizar(p.imagen_url, 480)}
            alt={nombre}
            loading="lazy"
            decoding="async"
            className="
              h-full w-full object-contain p-2
              transition-transform duration-300
              hover:scale-105
            "
          />
        ) : (
          <div
            className="
              flex h-full w-full items-center
              justify-center bg-white
            "
          >
            <Icono className="h-12 w-12 text-intenso" />
          </div>
        )}
      </Link>

      {/* INFORMACION */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-3">

        <p
          className="
            mb-1 truncate text-xs
            font-medium text-white/70
          "
        >
          {p.categoria || "Producto digital"}
        </p>

        <Link
          href={`/producto/${p.slug}`}
          className="
            line-clamp-2 min-h-[40px]
            text-sm font-semibold leading-5
            text-white transition
            hover:text-cian
          "
        >
          {nombre}
        </Link>

        {/* PRECIO Y CARRITO */}
        <div
          className="
            mt-3 flex flex-col items-stretch
            gap-2
          "
        >
          <div className="min-w-0">
            {p.con_planes && (
              <p className="mb-0.5 text-xs text-white/70">
                Desde
              </p>
            )}

            {tienePrecio ? (
              <p
                className="
                  whitespace-nowrap text-[15px]
                  font-extrabold tracking-tight
                  text-cian sm:text-lg
                "
              >
                Bs {precio.toFixed(2)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-cian">
                Consultar precio
              </p>
            )}
          </div>

          <AccionTarjeta p={{ ...p, nombre }} />
        </div>
      </div>
    </article>
  );
}
