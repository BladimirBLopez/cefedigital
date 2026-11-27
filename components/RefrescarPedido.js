"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefrescarPedido() {
  const router = useRouter();

  useEffect(() => {
    let veces = 0;
    let temporizador;

    const siguiente = () => {
      if (veces >= 22) return;

      const espera = veces < 10 ? 30000 : 300000;

      temporizador = setTimeout(() => {
        veces += 1;
        router.refresh();
        siguiente();
      }, espera);
    };

    siguiente();

    return () => clearTimeout(temporizador);
  }, [router]);

  return null;
}
