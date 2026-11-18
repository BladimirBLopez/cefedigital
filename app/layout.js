import "./globals.css";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import NotificacionRuta from "@/components/NotificacionRuta";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: { default: "Cefe Digital | Licencias, streaming y recargas", template: "%s | Cefe Digital" },
  description: "Licencias, streaming y recargas con entrega rápida.",
  openGraph: { title: "Cefe Digital", description: "Licencias, streaming y recargas con entrega rápida.", type: "website", locale: "es_BO" },
};

export const viewport = { themeColor: "#01075D" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Suspense fallback={null}>
          <NotificacionRuta />
        </Suspense>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
