import { betterAuth } from "better-auth";
import { Pool } from "pg";

const conexion = String(process.env.DATABASE_URL || "")
  .replace(/([?&])channel_binding=[^&]*&?/, "$1")
  .replace(/[?&]$/, "");

const pool = new Pool({ connectionString: conexion, max: 1 });

const base = process.env.BETTER_AUTH_URL
  ? process.env.BETTER_AUTH_URL.replace("://cefedigital.shop", "://www.cefedigital.shop")
  : undefined;

export const auth = betterAuth({
  database: pool,
  baseURL: base,
  trustedOrigins: ["https://www.cefedigital.shop", "https://cefedigital.shop"],
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
});
