import { sql } from "@/lib/db";
import { asegurarEsquema } from "@/lib/esquema";

export const dynamic = "force-dynamic";

const responder = (datos, status = 200) =>
  Response.json(datos, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug");

  if (!slug || slug.length > 150) {
    return responder({ error: "Producto inválido" }, 400);
  }

  try {
    await asegurarEsquema();

    const [producto] = await sql`
      select id, slug, nombre, imagen_url, tipo, campo_cliente, proveedor, central_one_target_fields,
             precio::float as precio
      from productos
      where slug = ${slug}
        and activo
        and (proveedor is null or proveedor_disponible = true)
      limit 1
    `;

    if (!producto) {
      return responder({ error: "Producto no disponible" }, 404);
    }

    const planes = await sql`
      select id, perfil, pantallas, meses_pagados,
             duracion_dias, precio::float as precio,
             compartida, modalidad
      from planes
      where producto_id = ${producto.id} and activo
      order by orden, id
    `;

    return responder({
      producto: (({ proveedor, central_one_target_fields, ...resto }) => ({
        ...resto,
        id: Number(producto.id),
        pide_datos_co:
          proveedor === "central_one" &&
          Array.isArray(central_one_target_fields) &&
          central_one_target_fields.length > 0
      }))(producto),
      planes: planes.map(plan => ({
        ...plan,
        id: Number(plan.id),
        precio: Number(plan.precio)
      }))
    });
  } catch (error) {
    console.error("Error opciones carrito:", error);
    return responder({ error: "Error al consultar producto" }, 500);
  }
}
