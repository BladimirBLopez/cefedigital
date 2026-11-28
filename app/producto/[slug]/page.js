import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";
import { obtenerAjustes } from "@/lib/ajustes";
import TiendaHeader from "@/components/TiendaHeader";
import TiendaFooter from "@/components/TiendaFooter";
import { optimizar } from "@/lib/imagen";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiInfo,
  FiCheckCircle
} from "react-icons/fi";
import SelectorPlan from "@/components/SelectorPlan";
import AgregarCarrito from "@/components/AgregarCarrito";
import PrecioProducto from "@/components/PrecioProducto";
import TarjetaProducto from "@/components/TarjetaProducto";
import { limpiarNombre } from "@/lib/nombre-producto";
import { grupoDe } from "@/lib/categorias-tienda";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  await asegurarEsquema();
  const { slug } = await params;

  const [p] = await sql`
    SELECT nombre, descripcion
    FROM productos
    WHERE slug = ${slug} AND activo AND (proveedor IS NULL OR proveedor_disponible = TRUE)
  `;

  if (!p) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: limpiarNombre(p.nombre),
    description: (
      p.descripcion ||
      `${p.nombre} en Cefe Digital. Consulta los planes disponibles.`
    ).slice(0, 150)
  };
}

const campo =
  "w-full rounded-xl border border-neutral-300 bg-white " +
  "px-4 py-3 text-sm text-marino outline-none " +
  "focus:border-intenso focus:ring-2 focus:ring-intenso/10";

export default async function Producto({
  params,
  searchParams
}) {
  const { slug } = await params;
  await asegurarEsquema();
  const sp = await searchParams;
  const aj = await obtenerAjustes();

  const [p] = await sql`
    SELECT
      id,
      slug,
      nombre,
      categoria,
      descripcion,
      imagen_url,
      tipo,
      campo_cliente,
      proveedor,
      central_one_target_fields,
      central_one_target_schema,
      precio::float AS precio
    FROM productos
    WHERE slug = ${slug} AND activo AND (proveedor IS NULL OR proveedor_disponible = TRUE)
  `;

  if (!p) notFound();
    p.nombre = limpiarNombre(p.nombre);

  const planes = await sql`
    SELECT
      id,
      perfil,
      pantallas,
      perfiles,
      dispositivos,
      calidad,
      meses_pagados,
      duracion_dias,
      precio::float AS precio,
      compartida,
      modalidad
    FROM planes
    WHERE producto_id = ${p.id} AND activo
    ORDER BY orden, id
  `;

  const hayPlanes = planes.length > 0;
  const esRecarga = p.tipo === "recarga";

    const grupoP = grupoDe(p.categoria, p.nombre);
    let relacionados = [];
    if (grupoP) {
      const recientes = await sql`
        select p2.slug, p2.nombre, p2.categoria, p2.imagen_url, p2.tipo, p2.campo_cliente,
          coalesce(
            (select min(pl.precio) from planes pl
             where pl.producto_id = p2.id and pl.activo),
            p2.precio
          )::float as precio,
          exists (
            select 1 from planes pl
            where pl.producto_id = p2.id and pl.activo
          ) as con_planes
        from productos p2
        where p2.activo and (p2.proveedor is null or p2.proveedor_disponible = true)
          and p2.proveedor is distinct from 'central_one'
        order by p2.id desc
        limit 300
      `;
      relacionados = recientes
        .filter((r) => r.slug !== p.slug && grupoDe(r.categoria, r.nombre) === grupoP)
        .slice(0, 4);
    }

  const esquemaCo = Array.isArray(p.central_one_target_schema)
    ? p.central_one_target_schema
    : [];

  const camposCo =
    p.proveedor === "central_one" &&
    Array.isArray(p.central_one_target_fields) &&
    p.central_one_target_fields.length > 0
      ? p.central_one_target_fields.map((clave) => {
          const def = esquemaCo.find((c) => c && c.key === String(clave));
          const lista =
            def && def.type === "select" && Array.isArray(def.options)
              ? def.options.map((o) => ({
                  value: String(o.value),
                  label: String(o.label || o.value)
                }))
              : [];

          return {
            key: String(clave),
            label: String(def?.label || clave),
            type: lista.length > 0 ? "select" : "text",
            options: lista
          };
        })
      : [];
  const cuentaSinPlan =
    p.tipo === "cuenta" && !hayPlanes;

  const productoCarrito = {
    id: Number(p.id),
    slug: p.slug,
    nombre: p.nombre,
    imagen: p.imagen_url,
    precio: Number(p.precio),
    esRecarga,
    campo_cliente: p.campo_cliente,
    campos_co: camposCo
  };

  return (
    <>
      <TiendaHeader
        nombre={aj.nombre_tienda}
        whatsapp={aj.whatsapp}
      />

      <main className="mx-auto max-w-6xl px-4 pb-36 pt-5 sm:px-6 sm:pt-7">
        <nav aria-label="Navegación">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-intenso"
          >
            <FiArrowLeft className="h-4 w-4" />
            Volver a la tienda
          </Link>
        </nav>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2 lg:gap-7">

          {/* Imagen del producto */}
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex h-52 items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-intenso/5 p-5 sm:h-72 lg:h-[380px]">
              {p.imagen_url ? (
                <img
                  src={optimizar(p.imagen_url, 800)}
                  alt={p.nombre}
                  width={800}
                  height={800}
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-intenso/5">
                  <span className="px-6 text-center text-xl font-bold text-marino">
                    {p.nombre}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Información y compra */}
          <div className="space-y-4">

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              {p.categoria && (
                <span className="inline-flex rounded-full bg-turquesa/20 px-3 py-1 text-xs font-semibold text-marino">
                  {p.categoria}
                </span>
              )}

              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-marino sm:text-3xl">
                {p.nombre}
              </h1>

              <div className="mt-5">
                <PrecioProducto
                  planes={planes}
                  precioBase={p.precio}
                />
              </div>

              <div className="mt-5 flex items-start gap-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
                <FiMessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-intenso" />
                <span>
                  Atención y coordinación de pedidos por WhatsApp.
                </span>
              </div>
            </section>

            <section
              data-opciones
              className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div>
                <h2 className="text-lg font-bold text-marino">
                  Configura tu compra
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Elige tu plan y agrégalo al carrito.
                </p>
              </div>

              {cuentaSinPlan ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Este servicio no tiene planes disponibles en este momento.
                </div>
              ) : (
                <>
                  {hayPlanes ? (
                    <SelectorPlan planes={planes} />
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl bg-intenso/5 p-4">
                      <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-intenso" />
                      <p className="text-sm text-marino">
                        Listo para agregar: este producto no necesita elegir plan.
                      </p>
                    </div>
                  )}

                  {camposCo.map((c) => (
                    <div key={c.key} className="space-y-2">
                      <label
                        htmlFor={"co_" + c.key}
                        className="block text-sm font-bold text-marino"
                      >
                        {c.label}
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      {c.type === "select" ? (
                        <select
                          id={"co_" + c.key}
                          name={"co_" + c.key}
                          required
                          defaultValue=""
                          className={campo}
                        >
                          <option value="" disabled>
                            Elige una opción
                          </option>
                          {c.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={"co_" + c.key}
                          name={"co_" + c.key}
                          required
                          maxLength={64}
                          placeholder={"Ingresa " + c.label}
                          className={campo}
                        />
                      )}
                    </div>
                  ))}

                  {esRecarga && p.campo_cliente && camposCo.length === 0 && (
                    <div className="space-y-2">
                      <label
                        htmlFor="dato_cliente"
                        className="block text-sm font-bold text-marino"
                      >
                        {p.campo_cliente}
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id="dato_cliente"
                        name="dato_cliente"
                        required
                        maxLength={100}
                        placeholder={`Ingresa ${p.campo_cliente}`}
                        className={campo}
                      />
                    </div>
                  )}

                  {hayPlanes ? (
                    <input
                      type="hidden"
                      name="cantidad"
                      value="1"
                    />
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="cantidad"
                        className="block text-sm font-bold text-marino"
                      >
                        Cantidad
                      </label>

                      <select
                        id="cantidad"
                        name="cantidad"
                        defaultValue="1"
                        className={campo}
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "unidad" : "unidades"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {sp?.error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {sp.error === "dato"
                    ? `Falta: ${p.campo_cliente || "el dato solicitado"}`
                    : sp.error === "plan"
                      ? "Selecciona un plan válido."
                      : sp.error === "limite"
                        ? "Has realizado muchos pedidos seguidos. Inténtalo más tarde."
                        : "Revisa los datos de tu pedido e inténtalo nuevamente."}
                </p>
              )}
            </section>
          </div>
        </div>

        {/* Cómo funciona */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-marino">Cómo funciona</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Elige y agrega", "Selecciona tu plan y agrégalo al carrito."],
              ["Paga por QR", "Escanea el QR y tu pago se confirma solo."],
              ["Recibe tu producto", "Te lo entregamos y coordinamos por WhatsApp."]
            ].map(([t, d], i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-intenso text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-marino">{t}</p>
                  <p className="mt-0.5 text-xs leading-5 text-neutral-600">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/garantia" className="mt-4 inline-flex text-xs font-bold text-intenso hover:underline">
            Garantía de 7 días →
          </Link>
        </section>

        {/* Descripción y condiciones */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-marino">
            Información del producto
          </h2>

          {p.descripcion ? (
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-neutral-700">
              {p.descripcion}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-neutral-600">
              Consulta las características y condiciones de este servicio antes de comprar.
            </p>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-neutral-50 p-4">
            <FiInfo className="mt-0.5 h-5 w-5 shrink-0 text-intenso" />
            <p className="text-xs leading-5 text-neutral-600">
              La entrega, activación, compatibilidad y garantía pueden variar según el servicio contratado.
              Si tienes dudas, consulta las condiciones por WhatsApp antes de realizar tu pedido.
            </p>
          </div>
        </section>
      {relacionados.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-marino">También te puede interesar</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {relacionados.map((r) => (
                <TarjetaProducto key={r.slug} p={r} />
              ))}
            </div>
          </section>
        )}
      </main>

      <TiendaFooter
        nombre={aj.nombre_tienda}
        whatsapp={aj.whatsapp}
      />

      {/* Botón fijo de compra */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.07)] backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {cuentaSinPlan ? (
            <div className="rounded-xl bg-neutral-200 px-4 py-3.5 text-center text-sm font-bold text-neutral-500">
              Producto no disponible
            </div>
          ) : (
            <AgregarCarrito
              producto={productoCarrito}
              planes={planes}
            />
          )}
        </div>
      </div>

      <div className="h-24" aria-hidden="true" />
    </>
  );
}
