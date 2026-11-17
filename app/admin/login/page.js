import { redirect } from "next/navigation";
import { claveCorrecta, crearSesion, haySesion } from "@/lib/auth";
import { ipCliente, contar, anotar } from "@/lib/limite";

export const dynamic = "force-dynamic";

async function entrar(formData) {
  "use server";
  const ip = await ipCliente();
  if ((await contar("login", ip, 15)) >= 5) redirect("/admin/login?error=bloqueado");
  if (!claveCorrecta(formData.get("clave"))) {
    await anotar("login", ip);
    redirect("/admin/login?error=1");
  }
  await crearSesion();
  redirect("/admin");
}

export default async function Login({ searchParams }) {
  if (await haySesion()) redirect("/admin");
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={entrar} className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-acento">Panel de administración</h1>
        <p className="text-sm text-neutral-500 mt-1 mb-5">Ingresa tu clave</p>
        <input
          name="clave"
          type="password"
          required
          autoFocus
          placeholder="Clave"
          className="w-full rounded-xl bg-neutral-100 border border-neutral-300 px-4 py-3 outline-none focus:border-acento"
        />
        {sp?.error && <p className="text-sm text-red-600 mt-3">{sp.error === "bloqueado" ? "Demasiados intentos. Espera 15 minutos." : "Clave incorrecta"}</p>}
        <button className="w-full mt-5 rounded-xl bg-intenso hover:bg-marino text-white font-semibold py-3">Entrar</button>
      </form>
    </main>
  );
}
