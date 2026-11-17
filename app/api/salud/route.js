import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await sql`select count(*)::int as productos from productos`;
    return Response.json({ ok: true, productos: r[0].productos });
  } catch (e) {
    return Response.json({ ok: false, error: "No conecta con la base" }, { status: 500 });
  }
}
