import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const responder = (datos, status = 200) =>
  Response.json(datos, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug");

  if (!slug || slug.length > 150) {
    return responder({ error: "Producto inválido" }, 400);
  }

  try {
    const [producto] = await sql`
      SELECT id, slug, nombre, imagen_url,
             tipo, campo_cliente,
             precio::float AS precio
      FROM productos
      WHERE slug = ${slug} AND activo
      LIMIT 1
    `;

    if (!producto) {
      return responder({ error: "Producto no disponible" }, 404);
    }

    const planes = await sql`
      SELECT id, perfil, pantallas, meses_pagados,
             duracion_dias, precio::float AS precio,
             compartida, modalidad
      FROM planes
      WHERE producto_id = ${producto.id} AND activo
      ORDER BY orden, id
    `;

    return responder({
      producto: {
        ...producto,
        id: Number(producto.id),
      },
      planes: planes.map((plan) => ({
        ...plan,
        id: Number(plan.id),
        precio: Number(plan.precio),
      })),
    });
  } catch (error) {
    console.error("Error opciones carrito:", error);
    return responder({ error: "Error al consultar producto" }, 500);
  }
}
