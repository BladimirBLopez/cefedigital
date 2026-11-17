import { sql } from "@/lib/db";

let listo = null;

export function asegurarEsquema() {
  if (!listo) {
    listo = sql`alter table productos add column if not exists vence date`.catch((e) => {
      listo = null;
      throw e;
    });
  }
  return listo;
}
