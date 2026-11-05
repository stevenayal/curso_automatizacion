// Renderiza el HTML de un documento de requerimientos a partir del modelo de
// datos de grupo-NN.mjs. Un archivo HTML autocontenido por grupo (CSS
// embebido) — Chrome headless lo imprime a PDF en build.mjs.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

function esc(value) {
  return String(value).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

// Marcado inline mínimo sobre texto ya escapado: `código` y **negrita**.
function md(value) {
  return esc(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function lista(items) {
  if (!items || items.length === 0) return "";
  return `<ul>${items.map((i) => `<li>${md(i)}</li>`).join("")}</ul>`;
}

function tabla(headers, filas) {
  return `<table class="tabla">
    <thead><tr>${headers.map((h) => `<th>${md(h)}</th>`).join("")}</tr></thead>
    <tbody>${filas
      .map((f) => `<tr>${f.map((c) => `<td>${md(c ?? "")}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table>`;
}

const CSS = `
  /* El margen real que separa cabecera y pie del contenido lo define ESTE
     @page: Chrome pagina el texto usando esta caja, y build.mjs solo puede
     recortar/reposicionar lo que ya entra en ella — con margin:0 el texto
     ocupa toda la altura de la página y la cabecera pisa la primera línea. */
  @page { size: A4; margin: 25mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.2pt;
    line-height: 1.5;
    color: #16202b;
  }
  h1, h2, h3, h4 { color: #0b3d6b; line-height: 1.25; margin: 0; }
  h2 {
    font-size: 15pt;
    margin: 22px 0 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #d7e3ee;
    page-break-after: avoid;
  }
  h3 { font-size: 12pt; margin: 16px 0 6px; page-break-after: avoid; }
  h4 { font-size: 10.4pt; margin: 12px 0 4px; color: #23415c; page-break-after: avoid; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 8px; padding-left: 18px; }
  li { margin-bottom: 3px; }
  code {
    font-family: "Cascadia Mono", Consolas, "Courier New", monospace;
    font-size: 0.88em;
    background: #eef3f8;
    border: 1px solid #dde6ef;
    border-radius: 3px;
    padding: 0 3px;
  }
  .tabla {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 12px;
    font-size: 9.2pt;
    page-break-inside: avoid;
  }
  .tabla th, .tabla td {
    border: 1px solid #cfdbe6;
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }
  .tabla th { background: #eaf1f7; color: #0b3d6b; font-weight: 600; }
  .tabla tr:nth-child(even) td { background: #f8fafc; }
  .tabla code { background: transparent; border: 0; padding: 0; }

  .portada {
    height: 245mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    page-break-after: always;
  }
  .portada .logo-cover { width: 84px; height: 84px; margin-top: 20mm; object-fit: contain; }
  .portada .bloque {
    width: 100%;
    max-width: 480px;
    background: #0b3d6b;
    color: #fff;
    padding: 26px 28px;
    border-radius: 6px;
    margin-top: 16mm;
  }
  .portada .grupo { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; opacity: .85; }
  .portada h1 { color: #fff; font-size: 26pt; margin: 8px 0 10px; }
  .portada .modulo { font-size: 13pt; opacity: .92; }
  .portada .curso { margin-top: 26px; font-size: 11pt; color: #35506b; }
  .portada .profesor { margin-top: 4px; font-size: 10pt; color: #4a6a8a; }
  .portada .meta { margin-top: auto; width: 100%; max-width: 480px; text-align: left; }
  .portada .aviso {
    margin-top: 12px;
    font-size: 8.6pt;
    color: #55697d;
    border-left: 3px solid #cfdbe6;
    padding-left: 10px;
  }

  .indice { page-break-after: always; }
  .indice ol { padding-left: 20px; }
  .indice li { margin-bottom: 5px; font-weight: 600; color: #0b3d6b; }

  .rf {
    border: 1px solid #cfdbe6;
    border-left: 4px solid #0b3d6b;
    border-radius: 4px;
    padding: 10px 13px 4px;
    margin: 0 0 12px;
    page-break-inside: avoid;
  }
  .rf-cab { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .rf-id { font-weight: 700; color: #0b3d6b; font-size: 10.6pt; }
  .rf-ruta {
    font-family: "Cascadia Mono", Consolas, monospace;
    font-size: 8.6pt;
    background: #eef3f8;
    border: 1px solid #dde6ef;
    border-radius: 3px;
    padding: 1px 6px;
    white-space: nowrap;
  }
  .rf h4 { margin-top: 8px; }
  .nota {
    background: #fff8e6;
    border: 1px solid #f0dfae;
    border-left: 4px solid #d9a520;
    border-radius: 4px;
    padding: 9px 12px;
    margin: 10px 0 14px;
    font-size: 9.4pt;
    page-break-inside: avoid;
  }
  .fuente { font-size: 8.6pt; color: #5b6f83; margin-top: 2px; }
`;

function portada(g, meta) {
  const logo = meta.logoDataUri
    ? `<img class="logo-cover" src="${meta.logoDataUri}" alt="CIT">`
    : "";
  return `<section class="portada">
    ${logo}
    <div class="bloque">
      <div class="grupo">Grupo ${g.n} &middot; Requerimientos funcionales</div>
      <h1>${md(g.titulo)}</h1>
      <div class="modulo">${md(g.modulo)}</div>
    </div>
    <p class="curso"><strong>${md(meta.curso)}</strong><br>${md(meta.institucion)}</p>
    ${meta.profesor ? `<p class="profesor">Profesor: ${md(meta.profesor)}</p>` : ""}
    <div class="meta">
      ${tabla(
        ["Campo", "Valor"],
        [
          ["Documento", `Requerimientos funcionales — Grupo ${g.n}`],
          ["Versión", meta.version],
          ["Fecha", meta.fecha],
          ["Sistemas alcanzados", meta.sistemas],
          ["Fuente de la lógica", meta.fuenteLogica],
          [
            "Uso previsto",
            "Base para escribir escenarios BDD/Gherkin y casos de prueba automatizados",
          ],
        ],
      )}
      <p class="aviso">${md(meta.aviso)}</p>
    </div>
  </section>`;
}

function indice(secciones) {
  return `<section class="indice">
    <h2>Contenido</h2>
    <ol>${secciones.map((s) => `<li>${md(s)}</li>`).join("")}</ol>
  </section>`;
}

function bloqueRf(rf) {
  return `<div class="rf">
    <div class="rf-cab">
      <span class="rf-id">${md(rf.id)} — ${md(rf.nombre)}</span>
      <span class="rf-ruta">${md(rf.endpoint)}</span>
    </div>
    <p>${md(rf.descripcion)}</p>
    <h4>Entradas y validaciones</h4>
    ${lista(rf.entradas)}
    <h4>Reglas de negocio</h4>
    ${lista(rf.reglas)}
    <h4>Respuesta esperada</h4>
    ${lista(rf.respuesta)}
    <h4>Errores</h4>
    ${tabla(["Código", "HTTP", "Cuándo ocurre"], rf.errores)}
    <p class="fuente">Fuente: ${md(rf.fuente)}</p>
  </div>`;
}

function criterios(rfs) {
  return rfs
    .map((rf) => `<h3>${md(rf.id)} — ${md(rf.nombre)}</h3>${lista(rf.criterios)}`)
    .join("");
}

export const SECCIONES = [
  "Alcance y actores",
  "Precondiciones y acceso",
  "Modelo de datos del módulo",
  "Requerimientos funcionales",
  "Reglas transversales de la API",
  "Flujo en la aplicación web",
  "Criterios de aceptación",
  "Anexo normativo (BCP / SEDECO) y brechas",
];

export function renderDocumento(g, comun, meta) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Grupo ${g.n} — ${esc(g.titulo)}</title>
<style>${CSS}</style>
</head>
<body>
${portada(g, meta)}
${indice(SECCIONES)}

<h2>1. Alcance y actores</h2>
<p>${md(g.alcance)}</p>
${g.fueraDeAlcance ? `<p>${md(`**Fuera de alcance:** ${g.fueraDeAlcance}`)}</p>` : ""}
<h3>Actores</h3>
${tabla(["Actor", "Descripción"], comun.actores)}
<h3>Endpoints del módulo</h3>
${tabla(
  ["Método y ruta", "Requerimiento", "Descripción"],
  g.endpoints.map((e) => [e.ruta, e.rf, e.desc]),
)}

<h2>2. Precondiciones y acceso</h2>
${lista(comun.precondiciones)}
${g.precondiciones ? lista(g.precondiciones) : ""}

<h2>3. Modelo de datos del módulo</h2>
${g.tablas
  .map(
    (t) => `<h3>${md(t.nombre)}</h3>
    <p>${md(t.desc)}</p>
    ${tabla(["Columna", "Tipo / restricción"], t.columnas)}`,
  )
  .join("")}
${g.notaDatos ? `<div class="nota">${md(g.notaDatos)}</div>` : ""}

<h2>4. Requerimientos funcionales</h2>
${g.rf.map(bloqueRf).join("")}

<h2>5. Reglas transversales de la API</h2>
<p>${md(comun.transversalIntro)}</p>
${lista(comun.transversales)}
<h3>Códigos de éxito</h3>
${tabla(["Status", "Cuándo ocurre"], comun.statusExito)}
<h3>Códigos de error</h3>
${tabla(["Código", "HTTP", "Significado"], comun.errores)}

<h2>6. Flujo en la aplicación web</h2>
<p>${md(comun.webIntro)}</p>
${tabla(["Pantalla", "Qué permite hacer"], g.web.pantallas)}
${g.web.notas ? lista(g.web.notas) : ""}

<h2>7. Criterios de aceptación</h2>
<p>${md(comun.criteriosIntro)}</p>
${criterios(g.rf)}

<h2>8. Anexo normativo (BCP / SEDECO) y brechas</h2>
<div class="nota">${md(comun.avisoNormativo)}</div>
${tabla(
  ["Referencia normativa", "Expectativa", "Estado en el sandbox"],
  g.anexo.map((a) => [a.norma, a.expectativa, a.estado]),
)}
<h3>Brechas conocidas del sandbox</h3>
${lista(g.brechas)}
</body>
</html>`;
}
