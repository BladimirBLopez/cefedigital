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
  const nombresPartes = evento.nombres.split(/&|y/i).map(n => n.trim());
  const nombre1 = esc(nombresPartes[0] || evento.nombres);
  const nombre2 = esc(nombresPartes[1] || "");

  const fechaLarga = formatFechaLarga(evento.fecha_evento);
  const fechaObj = new Date(evento.fecha_evento);
  const diaSemana = fechaObj.toLocaleDateString("es-BO", { weekday: "long" });
  const diaNum = fechaObj.getDate();
  const mesNombre = fechaObj.toLocaleDateString("es-BO", { month: "long" });
  const anio = fechaObj.getFullYear();

  const mensaje = esc(evento.mensaje || "");
  const vestimenta = esc(evento.codigo_vestimenta || "");
  const color = evento.color_primario || "#F5A623";
  const foto = evento.foto_hero || "";
  const soloAdultos = evento.solo_adultos;
  const galeria = evento.fotos_galeria || [];

  const detalles = evento.detalles || {};
  const padreNovio = esc(detalles.padre_novio || "");
  const madreNovio = esc(detalles.madre_novio || "");
  const padreNovia = esc(detalles.padre_novia || "");
  const madreNovia = esc(detalles.madre_novia || "");
  const protocolo = Array.isArray(detalles.protocolo) ? detalles.protocolo : [];

  const tieneCeremonia = !!evento.lugar_ceremonia;
  const tieneRecepcion = !!evento.lugar_recepcion;

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
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
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
    overflow-x:hidden;
  }
  body.bloqueado{overflow:hidden;height:100vh;}
  section{padding:60px 24px;max-width:560px;margin:0 auto;text-align:center;}
  section h2{
    font-size:22px;font-weight:400;color:var(--accent);margin-bottom:18px;
  }
  section p{font-size:15px;line-height:1.7;color:#d8d5cc;font-family:sans-serif;}
  .divider{width:40px;height:1px;background:var(--accent);margin:0 auto 46px;opacity:.5;}
  .eyebrow{
    letter-spacing:.25em;text-transform:uppercase;font-size:12px;
    color:var(--accent);margin-bottom:14px;font-family:sans-serif;
  }

  /* ===== ENTRADA ===== */
  #entrada{
    position:fixed;inset:0;z-index:100;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:${foto ? `linear-gradient(rgba(11,11,13,.55),rgba(11,11,13,.85)),url('${foto}') center/cover` : "#0b0b0d"};
    text-align:center;padding:24px;transition:opacity .6s ease, visibility .6s ease;
  }
  #entrada h1{font-size:clamp(30px,9vw,48px);font-weight:400;margin:10px 0;}
  #entrada .amp{color:var(--accent);font-size:16px;margin:6px 0;font-family:sans-serif;letter-spacing:.1em;}
  #entrada .frase{font-family:sans-serif;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
  #entrada button{
    margin-top:34px;background:var(--accent);color:#181108;border:none;
    padding:14px 34px;border-radius:30px;font-size:13px;font-weight:700;
    letter-spacing:.05em;font-family:sans-serif;cursor:pointer;
  }
  #entrada.oculto{opacity:0;visibility:hidden;pointer-events:none;}

  /* ===== HERO ===== */
  .hero{
    position:relative;min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:40px 24px;overflow:hidden;
  }
  .hero::before{
    content:"";position:absolute;inset:0;
    background:${foto ? `url('${foto}') center/cover no-repeat` : "linear-gradient(160deg,#1a1a1d,#0b0b0d)"};
    filter:brightness(.45);z-index:0;
  }
  .hero::after{
    content:"";position:absolute;inset:0;
    background:radial-gradient(circle at 50% 100%, rgba(11,11,13,.2), rgba(11,11,13,.95) 85%);
    z-index:1;
  }
  .hero-content{position:relative;z-index:2;}
  .hero h1{font-size:clamp(32px,9vw,56px);font-weight:400;line-height:1.15;margin-bottom:14px;}
  .hero .fecha{font-size:15px;color:#c9c6bd;font-family:sans-serif;letter-spacing:.03em;}

  /* ===== NOMBRES SPLIT ===== */
  .nombres-split{padding:70px 24px;text-align:center;}
  .nombres-split h1{font-size:clamp(30px,10vw,52px);font-weight:400;}
  .nombres-split .amp{color:var(--accent);font-size:14px;margin:14px 0;font-family:sans-serif;letter-spacing:.2em;}

  .countdown{display:flex;gap:14px;margin-top:34px;justify-content:center;flex-wrap:wrap;}
  .countdown div{
    background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
    border-radius:12px;padding:14px 16px;min-width:64px;
  }
  .countdown span{display:block;font-size:24px;font-weight:600;font-family:sans-serif;}
  .countdown small{font-size:10px;color:#9a9a9f;text-transform:uppercase;letter-spacing:.08em;font-family:sans-serif;}

  /* ===== FECHA GRANDE ===== */
  .fecha-grande{text-align:center;}
  .fecha-grande .dia-semana{font-family:sans-serif;letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:var(--accent);margin-bottom:10px;}
  .fecha-grande .numero{font-size:110px;line-height:1;font-weight:300;color:var(--accent);}
  .fecha-grande .mes{font-family:sans-serif;text-transform:uppercase;letter-spacing:.15em;font-size:14px;margin-top:6px;}
  .fecha-grande .anio{font-size:15px;color:#9a9a9f;font-family:sans-serif;}

  /* ===== SALUDO INVITADO ===== */
  .saludo{font-family:sans-serif;}
  .saludo .nombre-inv{font-family:Georgia,serif;font-size:26px;color:var(--accent);margin:10px 0;}
  .saludo .pases{font-size:16px;margin-top:8px;}
  .saludo .pases b{color:var(--accent);}

  /* ===== VENUE CARDS ===== */
  .venue-card{
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
    border-radius:16px;overflow:hidden;margin-top:20px;text-align:left;font-family:sans-serif;
  }
  .venue-card img{width:100%;height:160px;object-fit:cover;display:block;}
  .venue-card .body{padding:18px 20px;}
  .venue-card h3{font-family:Georgia,serif;font-size:19px;font-weight:400;margin-bottom:4px;color:#f2f0ec;}
  .venue-card .tipo{color:var(--accent);font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}
  .venue-card .dir{font-size:13px;color:#9a9a9f;margin-bottom:14px;}
  .btn{
    display:inline-block;background:var(--accent);color:#181108;
    padding:11px 22px;border-radius:30px;font-size:13px;font-weight:600;
    text-decoration:none;font-family:sans-serif;letter-spacing:.02em;
  }

  /* ===== PADRES ===== */
  .padres-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;font-family:sans-serif;}
  .padres-grid .grupo .titulo{font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
  .padres-grid .grupo .nombre{font-size:15px;color:#e5e2da;margin:4px 0;font-family:Georgia,serif;}
  .padres-grid .grupo .amp{color:var(--accent);font-size:11px;margin:2px 0;}

  /* ===== GALERIA ===== */
  .galeria{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px;}
  .galeria img{width:100%;height:140px;object-fit:cover;border-radius:10px;}

  /* ===== PROTOCOLO ===== */
  .protocolo-list{margin-top:20px;text-align:left;font-family:sans-serif;}
  .protocolo-item{
    display:flex;gap:16px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08);
    align-items:baseline;
  }
  .protocolo-item:last-child{border-bottom:none;}
  .protocolo-item .hora{color:var(--accent);font-weight:600;font-size:14px;min-width:56px;}
  .protocolo-item .texto{font-size:14px;color:#d8d5cc;}

  .badges{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px;font-family:sans-serif;}
  .badge{font-size:12px;color:#c9c6bd;border:1px solid rgba(255,255,255,.15);padding:6px 14px;border-radius:20px;}

  /* ===== RSVP ===== */
  .rsvp-box{
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
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

  /* ===== CIERRE ===== */
  .cierre{
    position:relative;min-height:60vh;display:flex;align-items:center;justify-content:center;
    text-align:center;overflow:hidden;
  }
  .cierre::before{
    content:"";position:absolute;inset:0;
    background:${foto ? `url('${foto}') center/cover no-repeat` : "linear-gradient(160deg,#1a1a1d,#0b0b0d)"};
    filter:brightness(.35);z-index:0;
  }
  .cierre::after{
    content:"";position:absolute;inset:0;
    background:linear-gradient(rgba(11,11,13,.5),rgba(11,11,13,.9));z-index:1;
  }
  .cierre-content{position:relative;z-index:2;}
  .cierre h2{font-size:26px;font-weight:400;color:var(--accent);}

  footer{text-align:center;padding:34px 24px 60px;font-size:11px;color:#666;font-family:sans-serif;}
</style>
</head>
<body class="bloqueado">

<!-- ===== PANTALLA DE ENTRADA ===== -->
<div id="entrada">
  <div class="frase">¡Nos casamos!</div>
  <h1>${nombre1}</h1>
  <div class="amp">&amp;</div>
  <h1>${nombre2}</h1>
  <button onclick="document.getElementById('entrada').classList.add('oculto'); document.body.classList.remove('bloqueado');">Ver invitación</button>
</div>

<!-- ===== HERO ===== -->
<div class="hero">
  <div class="hero-content">
    <div class="eyebrow">Nos casamos</div>
    <h1>${nombres}</h1>
    <div class="fecha">${fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}</div>
  </div>
</div>

${mensaje ? `
<section>
  <h2>Nos casamos</h2>
  <div class="divider"></div>
  <p>${mensaje}</p>
</section>` : ""}

<!-- ===== SALUDO ===== -->
<section class="saludo">
  ${invitado ? `
    <div class="eyebrow">Estimado(a)</div>
    <div class="nombre-inv">${invitadoNombre}</div>
    <p>Te invitamos a nuestra boda</p>
    <div class="pases">Reservamos <b>${invitadoPases} pase(s)</b> en su honor</div>
  ` : `
    <div class="eyebrow">Querido invitado</div>
    <p>Te invitamos a celebrar este día tan especial con nosotros</p>
  `}
</section>

<!-- ===== COUNTDOWN + FECHA GRANDE ===== -->
<section>
  <div class="eyebrow">¡Agenda este día!</div>
  <div class="fecha-grande">
    <div class="dia-semana">${diaSemana}</div>
    <div class="numero">${diaNum}</div>
    <div class="mes">${mesNombre}</div>
    <div class="anio">${anio}</div>
  </div>
  <div class="countdown" id="countdown"></div>
</section>

<!-- ===== UBICACIONES ===== -->
<section>
  <h2>¿Dónde será?</h2>
  <div class="divider"></div>

  ${tieneCeremonia ? `
  <div class="venue-card">
    <div class="body">
      <div class="tipo">Ceremonia Religiosa${evento.hora_ceremonia ? " · " + evento.hora_ceremonia : ""}</div>
      <h3>${esc(evento.lugar_ceremonia)}</h3>
      ${evento.direccion_ceremonia ? `<div class="dir">${esc(evento.direccion_ceremonia)}</div>` : ""}
      ${evento.mapa_ceremonia_url ? `<a class="btn" href="${evento.mapa_ceremonia_url}" target="_blank" rel="noopener">Ver ubicación</a>` : ""}
    </div>
  </div>` : ""}

  ${tieneRecepcion ? `
  <div class="venue-card">
    <div class="body">
      <div class="tipo">Recepción Social${evento.hora_recepcion ? " · " + evento.hora_recepcion : ""}</div>
      <h3>${esc(evento.lugar_recepcion)}</h3>
      ${evento.direccion_recepcion ? `<div class="dir">${esc(evento.direccion_recepcion)}</div>` : ""}
      ${evento.mapa_recepcion_url ? `<a class="btn" href="${evento.mapa_recepcion_url}" target="_blank" rel="noopener">Ver ubicación</a>` : ""}
    </div>
  </div>` : ""}
</section>

${protocolo.length ? `
<section>
  <h2>Protocolo</h2>
  <div class="divider"></div>
  <div class="protocolo-list">
    ${protocolo.map(p => `
      <div class="protocolo-item">
        <div class="hora">${esc(p.hora)}</div>
        <div class="texto">${esc(p.texto)}</div>
      </div>
    `).join("")}
  </div>
  <div class="badges">
    ${vestimenta ? `<span class="badge">👗 ${vestimenta}</span>` : ""}
    ${soloAdultos ? `<span class="badge">🚫 Solo adultos</span>` : ""}
  </div>
</section>` : `
<section>
  <div class="badges">
    ${vestimenta ? `<span class="badge">👗 ${vestimenta}</span>` : ""}
    ${soloAdultos ? `<span class="badge">🚫 Solo adultos</span>` : ""}
  </div>
</section>`}

<!-- ===== RSVP ===== -->
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

${(padreNovio || madreNovio || padreNovia || madreNovia) ? `
<section>
  <h2>Con la bendición de Dios y de nuestros padres</h2>
  <div class="divider"></div>
  <div class="padres-grid">
    <div class="grupo">
      <div class="titulo">Padres del novio</div>
      ${padreNovio ? `<div class="nombre">${padreNovio}</div>` : ""}
      ${padreNovio && madreNovio ? `<div class="amp">&amp;</div>` : ""}
      ${madreNovio ? `<div class="nombre">${madreNovio}</div>` : ""}
    </div>
    <div class="grupo">
      <div class="titulo">Padres de la novia</div>
      ${padreNovia ? `<div class="nombre">${padreNovia}</div>` : ""}
      ${padreNovia && madreNovia ? `<div class="amp">&amp;</div>` : ""}
      ${madreNovia ? `<div class="nombre">${madreNovia}</div>` : ""}
    </div>
  </div>
</section>` : ""}

${galeria.length ? `
<section>
  <h2>Nuestros momentos</h2>
  <div class="divider"></div>
  <div class="galeria">
    ${galeria.map(url => `<img src="${url}" loading="lazy">`).join("")}
  </div>
</section>` : ""}

<!-- ===== CIERRE ===== -->
<div class="cierre">
  <div class="cierre-content">
    <h2>¡Te esperamos!</h2>
  </div>
</div>

<footer>Hecho con cariño para ${nombres}</footer>

<script>
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
