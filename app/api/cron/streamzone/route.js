import { sincronizarCatalogoStreamZone } from "@/lib/sincronizar-streamzone";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;

  if (
    !secreto ||
    request.headers.get("authorization") !== `Bearer ${secreto}`
  ) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarCatalogoStreamZone();

    return Response.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    console.error("Cron StreamZone:", error);

    return Response.json(
      { ok: false, error: "No se pudo sincronizar el catálogo." },
      { status: 500 }
    );
  }
}
