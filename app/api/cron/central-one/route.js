import { sincronizarCatalogoCentralOne } from "@/lib/sincronizar-central-one";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;

  if (
    !secreto ||
    request.headers.get("authorization") !== `Bearer ${secreto}`
  ) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarCatalogoCentralOne();

    return Response.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    console.error("Cron Central One:", error);

    return Response.json(
      { ok: false, error: "No se pudo sincronizar el catálogo." },
      { status: 500 }
    );
  }
}
