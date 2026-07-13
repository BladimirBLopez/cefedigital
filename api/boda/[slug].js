const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://gdkgacqfvwsyhfjrkxbq.supabase.co";
const SUPABASE_KEY = "sb_publishable_85wL-cG5IUEtHadIXRvfEQ_hNksKI9Q";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFechaLarga(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatHora(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}

module.exports = async (req, res) => {
  const { slug } = req.query;
  const guestSlug = req.query.g || null;

  const { data: evento, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("slug", slug)
    .eq("tipo", "boda")
    .eq("activo", true)
    .maybeSingle();

  if (error || !evento) {
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Invitación no encontrada</title>
    <style>body{font-family:sans-serif;background:#0d0d0f;color:#f2f2f0;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center;margin:0}</style>
    </head><body><div><h1>💔 Invitación no encontrada</h1><p>Este enlace no existe o ya no está activo.</p></div></body></html>`);
    return;
  }

  let invitado = null;
  if (guestSlug) {
    const nombreBuscado = guestSlug.replace(/-/g, " ");
    const { data: invitados } = await supabase
      .from("invitados")
      .select("*")
      .eq("evento_id", evento.id);
    if (invitados && invitados.length) {
      invitado = invitados.find(
        (g) => g.nombre.toLowerCase().trim() === nombreBuscado.toLowerCase().trim()
      ) || null;
    }
  }

  const nombres = esc(evento.nombres);
  const fechaLarga = formatFechaLarga(evento.fecha_evento);
  const horaEvento = evento.hora_recepcion || formatHora(evento.fecha_evento);
  const lugar = esc(evento.lugar_recepcion || "");
  const mapaUrl = evento.mapa_recepcion_url || "";
  const mensaje = esc(evento.mensaje || "");
  const vestimenta = esc(evento.codigo_vestimenta || "");
  const color = evento.color_primario || "#F5A623";
  const foto = evento.foto_hero || "";
  const soloAdultos = evento.solo_adultos;

  const ogTitle = `💍 ${nombres} — Nuestra Boda`;
  const ogDesc = mensaje
    ? mensaje.slice(0, 150)
    : `Tenemos el agrado de invitarte a nuestra boda el ${fechaLarga}. ¡Nos encantaría contar contigo!`;
  const canonicalUrl = `https://${req.headers.host}/boda/${slug}${guestSlug ? "?g=" + guestSlug : ""}`;

  const invitadoNombre = invitado ? esc(invitado.nombre) : null;
  const invitadoPases = invitado ? invitado.pases : null;
  const invitadoId = invitado ? invitado.id : null;
  const yaRespondio = invitado ? invitado.confirmado : null;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ogTitle}</title>
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${esc(ogDesc)}">
${foto ? `<meta property="og:image" content="${foto}">` : ""}
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${esc(ogDesc)}">
${foto ? `<meta name="twitter:image" content="${foto}">` : ""}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
  :root{ --accent:${color}; }
  *{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{
    font-family:'Georgia',serif;
    background:#0b0b0d;
    color:#f2f0ec;
    -webkit-font-smoothing:antialiased;
  }
  .hero{
    position:relative;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    text-align:center;
    padding:40px 24px;
    overflow:hidden;
  }
  .hero::before{
    content:"";
    position:absolute;inset:0;
    background:${foto ? `url('${foto}') center/cover no-repeat` : "linear-gradient(160deg,#1a1a1d,#0b0b0d)"};
    filter:brightness(.45);
    z-index:0;
  }
  .hero::after{
    content:"";
    position:absolute;inset:0;
    background:radial-gradient(circle at 50% 100%, rgba(11,11,13,.2), rgba(11,11,13,.95) 85%);
    z-index:1;
  }
  .hero-content{position:relative;z-index:2;}
  .eyebrow{
    letter-spacing:.25em;text-transform:uppercase;font-size:12px;
    color:var(--accent);margin-bottom:18px;font-family:sans-serif;
  }
  .hero h1{
    font-size:clamp(32px,9vw,56px);
    font-weight:400;
    line-height:1.15;
    margin-bottom:14px;
  }
  .hero .fecha{
    font-size:15px;color:#c9c6bd;font-family:sans-serif;letter-spacing:.03em;
  }
  .countdown{
    display:flex;gap:14px;margin-top:34px;justify-content:center;flex-wrap:wrap;
  }
  .countdown div{
    background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.12);
    border-radius:12px;
    padding:14px 16px;
    min-width:64px;
  }
  .countdown span{display:block;font-size:24px;font-weight:600;font-family:sans-serif;}
  .countdown small{font-size:10px;color:#9a9a9f;text-transform:uppercase;letter-spacing:.08em;font-family:sans-serif;}

  section{padding:60px 24px;max-width:560px;margin:0 auto;text-align:center;}
  section h2{
    font-size:22px;font-weight:400;color:var(--accent);margin-bottom:18px;
    font-family:'Georgia',serif;
  }
  section p{font-size:15px;line-height:1.7;color:#d8d5cc;font-family:sans-serif;}
  .divider{width:40px;height:1px;background:var(--accent);margin:0 auto 60px;opacity:.5;}

  .detail-card{
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08);
    border-radius:16px;
    padding:24px;
    margin-top:18px;
    font-family:sans-serif;
  }
  .detail-card .lugar{font-size:17px;margin-bottom:6px;}
  .detail-card .hora{color:#9a9a9f;font-size:13px;margin-bottom:16px;}
  .btn{
    display:inline-block;
    background:var(--accent);color:#181108;
    padding:12px 24px;border-radius:30px;
    font-size:13px;font-weight:600;text-decoration:none;
    font-family:sans-serif;letter-spacing:.02em;
  }
  .badges{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px;font-family:sans-serif;}
  .badge{
    font-size:12px;color:#c9c6bd;border:1px solid rgba(255,255,255,.15);
    padding:6px 14px;border-radius:20px;
  }

  .rsvp-box{
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08);
    border-radius:16px;padding:28px 22px;font-family:sans-serif;
  }
  .rsvp-box .nombre-invitado{font-size:18px;color:var(--accent);margin-bottom:4px;}
  .rsvp-box .pases-info{font-size:13px;color:#9a9a9f;margin-bottom:22px;}
  .rsvp-buttons{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
  .rsvp-buttons button{
    flex:1;min-width:130px;padding:13px 10px;border-radius:30px;border:none;
    font-size:14px;font-weight:600;cursor:pointer;font-family:sans-serif;
  }
  .btn-si{background:var(--accent);color:#181108;}
  .btn-no{background:transparent;color:#d8d5cc;border:1px solid rgba(255,255,255,.2) !important;}
  .rsvp-msg{margin-top:16px;font-size:13px;color:#9a9a9f;}
  .rsvp-done{font-size:15px;color:var(--accent);}

  footer{text-align:center;padding:40px 24px 60px;font-size:12px;color:#666;font-family:sans-serif;}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-content">
    <div class="eyebrow">Nos casamos</div>
    <h1>${nombres}</h1>
    <div class="fecha">${fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}</div>
    <div class="countdown" id="countdown"></div>
  </div>
</div>

${mensaje ? `<section><h2>Un mensaje para ti</h2><div class="divider"></div><p>${mensaje}</p></section>` : ""}

<section>
  <h2>Detalles del evento</h2>
  <div class="divider"></div>
  <div class="detail-card">
    <div class="lugar">${lugar}</div>
    <div class="hora">${fechaLarga} · ${horaEvento} hrs</div>
    ${mapaUrl ? `<a class="btn" href="${mapaUrl}" target="_blank" rel="noopener">Ver ubicación</a>` : ""}
  </div>
  <div class="badges">
    ${vestimenta ? `<span class="badge">👗 ${vestimenta}</span>` : ""}
    ${soloAdultos ? `<span class="badge">🚫 Solo adultos</span>` : ""}
  </div>
</section>

<section id="rsvpSection">
  <h2>Confirma tu asistencia</h2>
  <div class="divider"></div>
  <div class="rsvp-box" id="rsvpBox">
    ${invitado ? `
      <div class="nombre-invitado">Hola, ${invitadoNombre}</div>
      <div class="pases-info">Tienes ${invitadoPases} pase(s) reservado(s)</div>
      ${yaRespondio === null ? `
        <div class="rsvp-buttons">
          <button class="btn-si" onclick="responder(true)">Sí, ahí estaré</button>
          <button class="btn-no" onclick="responder(false)">No podré ir</button>
        </div>
      ` : yaRespondio === true ? `
        <div class="rsvp-done">✓ Ya confirmaste tu asistencia. ¡Te esperamos!</div>
      ` : `
        <div class="rsvp-done">Registramos que no podrás asistir. ¡Gracias por avisar!</div>
      `}
    ` : `
      <p>Para confirmar tu asistencia, usa el enlace personal que te enviaron los novios.</p>
    `}
    <div class="rsvp-msg" id="rsvpMsg"></div>
  </div>
</section>

<footer>Hecho con cariño para ${nombres}</footer>

<script>
  // Countdown
  const fechaEvento = new Date("${evento.fecha_evento}").getTime();
  const cd = document.getElementById("countdown");
  function tick(){
    const now = Date.now();
    const diff = fechaEvento - now;
    if (diff <= 0){ cd.innerHTML = "<div><span>¡Hoy!</span></div>"; return; }
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    cd.innerHTML = \`
      <div><span>\${d}</span><small>Días</small></div>
      <div><span>\${h}</span><small>Horas</small></div>
      <div><span>\${m}</span><small>Min</small></div>
      <div><span>\${s}</span><small>Seg</small></div>
    \`;
  }
  tick(); setInterval(tick, 1000);

  // RSVP
  const sb = supabase.createClient("${SUPABASE_URL}", "${SUPABASE_KEY}");
  async function responder(asiste){
    const box = document.getElementById("rsvpBox");
    const msg = document.getElementById("rsvpMsg");
    msg.textContent = "Guardando...";
    const { error } = await sb.from("invitados")
      .update({ confirmado: asiste, fecha_respuesta: new Date().toISOString() })
      .eq("id", "${invitadoId || ""}");
    if (error){ msg.textContent = "Hubo un error, intenta de nuevo."; return; }
    box.innerHTML = asiste
      ? '<div class="rsvp-done">✓ ¡Gracias por confirmar! Te esperamos.</div>'
      : '<div class="rsvp-done">Registramos que no podrás asistir. ¡Gracias por avisar!</div>';
  }
</script>

</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};
