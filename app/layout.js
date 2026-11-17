import "./globals.css";

export const metadata = { title: "Cefe Digital", description: "Productos digitales" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
