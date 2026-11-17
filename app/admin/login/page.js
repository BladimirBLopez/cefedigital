import { redirect } from "next/navigation";
import { claveCorrecta, crearSesion, haySesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function entrar(formData) {
  "use server";
  if (!claveCorrecta(formData.get("clave"))) redirect("/admin/login?error=1");
  await crearSesion();
  redirect("/admin");
}

export default async function Login({ searchParams }) {
  if (await haySesion()) redirect("/admin");
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={entrar} className="w-full max-w-sm bg-[#161618] border border-neutral-800 rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-acento">Panel de administración</h1>
        <p className="text-sm text-neutral-400 mt-1 mb-5">Ingresa tu clave</p>
        <input
          name="clave"
          type="password"
          required
          autoFocus
          placeholder="Clave"
          className="w-full rounded-xl bg-[#1e1e21] border border-neutral-700 px-4 py-3 outline-none focus:border-acento"
        />
        {sp?.error && <p className="text-sm text-red-400 mt-3">Clave incorrecta</p>}
        <button className="w-full mt-5 rounded-xl bg-acento text-[#181108] font-semibold py-3">Entrar</button>
      </form>
    </main>
  );
}
