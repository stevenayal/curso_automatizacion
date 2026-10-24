// Genera los PDFs de requerimientos: arma el HTML de cada grupo con
// plantilla.mjs y lo imprime con Chrome headless vía el protocolo DevTools
// (para poder poner pie de página con numeración). Si el canal DevTools no
// levanta, cae a `--print-to-pdf`, que produce el mismo documento sin pie.
//
// Uso:  node _src/build.mjs [numeroDeGrupo ...]
//       node _src/build.mjs         -> los 5 grupos
//       node _src/build.mjs 1 3     -> solo los grupos 1 y 3

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { renderDocumento } from "./plantilla.mjs";
import { COMUN, META } from "./comun.mjs";

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(SRC, "..");
const HTML_DIR = join(SRC, "html");
const PORT = 9333;

const LOGO_PATH = join(SRC, "assets", "cit-logo.png");

async function cargarLogoDataUri() {
  const buffer = await readFile(LOGO_PATH);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

const NAVEGADORES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function buscarNavegador() {
  const encontrado = NAVEGADORES.find((p) => existsSync(p));
  if (!encontrado) throw new Error("No se encontró Chrome ni Edge para imprimir los PDFs.");
  return encontrado;
}

async function cargarGrupos() {
  const archivos = (await readdir(SRC))
    .filter((f) => /^grupo-\d{2}\.mjs$/.test(f))
    .sort();
  const grupos = [];
  for (const archivo of archivos) {
    const mod = await import(pathToFileURL(join(SRC, archivo)).href);
    grupos.push(mod.grupo);
  }
  return grupos.sort((a, b) => a.n - b.n);
}

// --- Cliente mínimo del protocolo DevTools sobre el WebSocket global de Node ---

class Devtools {
  constructor(ws) {
    this.ws = ws;
    this.siguienteId = 1;
    this.pendientes = new Map();
    this.escuchas = new Set();
    ws.addEventListener("message", (evento) => {
      const msg = JSON.parse(evento.data);
      if (msg.id && this.pendientes.has(msg.id)) {
        const { resolver, rechazar } = this.pendientes.get(msg.id);
        this.pendientes.delete(msg.id);
        if (msg.error) rechazar(new Error(msg.error.message));
        else resolver(msg.result);
      } else if (msg.method) {
        for (const escucha of this.escuchas) escucha(msg);
      }
    });
  }

  static async conectar(url) {
    const ws = new WebSocket(url);
    await new Promise((resolver, rechazar) => {
      ws.addEventListener("open", resolver, { once: true });
      ws.addEventListener("error", () => rechazar(new Error("No se pudo abrir el canal DevTools.")), {
        once: true,
      });
    });
    return new Devtools(ws);
  }

  enviar(method, params = {}, sessionId) {
    const id = this.siguienteId++;
    const mensaje = { id, method, params };
    if (sessionId) mensaje.sessionId = sessionId;
    return new Promise((resolver, rechazar) => {
      this.pendientes.set(id, { resolver, rechazar });
      this.ws.send(JSON.stringify(mensaje));
    });
  }

  esperarEvento(method, sessionId, timeoutMs = 30000) {
    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => {
        this.escuchas.delete(escucha);
        rechazar(new Error(`Tiempo agotado esperando ${method}.`));
      }, timeoutMs);
      const escucha = (msg) => {
        if (msg.method !== method) return;
        if (sessionId && msg.sessionId !== sessionId) return;
        clearTimeout(temporizador);
        this.escuchas.delete(escucha);
        resolver(msg);
      };
      this.escuchas.add(escucha);
    });
  }

  cerrar() {
    this.ws.close();
  }
}

async function esperarEndpoint(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      // el navegador todavía no levantó el canal
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("El canal DevTools no respondió.");
}

function pieDePagina(titulo) {
  return `<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5pt;color:#5b6f83;padding:0 18mm;display:flex;justify-content:space-between;">
    <span>${titulo}</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`;
}

// Cabecera repetida en todas las páginas del PDF (incluida la portada): logo
// del CIT, nombre del curso y docente a cargo.
function cabeceraDePagina(logoDataUri) {
  return `<div style="position:relative;width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.4pt;color:#0b3d6b;box-sizing:border-box;padding:0 18mm 4.2mm 18mm;display:flex;align-items:center;justify-content:center;gap:7px;line-height:1;">
    <img src="${logoDataUri}" style="width:12px;height:12px;object-fit:contain;display:block;">
    <span style="font-weight:600;">Curso de Automatización de Pruebas de Software</span>
    <span style="opacity:.5;">&middot;</span>
    <span>Profesor: Steven Gracia</span>
    <span style="position:absolute;left:18mm;right:18mm;bottom:0;border-bottom:1px solid #cfdbe6;"></span>
  </div>`;
}

// Deben quedar por debajo de los márgenes del @page CSS (25/18/18/18mm): ese
// @page es el que realmente pagina el contenido, así que si estos números lo
// superan, la cabecera/el pie se componen encima de la primera o última línea.
const MARGENES = { marginTop: 0.93, marginBottom: 0.63, marginLeft: 0.71, marginRight: 0.71 };

async function imprimirConDevtools(navegador, documentos, headerTemplate) {
  const perfil = join(tmpdir(), "aiquaa-pdf-profile");
  const proceso = spawn(
    navegador,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${perfil}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    const wsUrl = await esperarEndpoint();
    const cdp = await Devtools.conectar(wsUrl);

    for (const doc of documentos) {
      const { targetId } = await cdp.enviar("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await cdp.enviar("Target.attachToTarget", { targetId, flatten: true });
      await cdp.enviar("Page.enable", {}, sessionId);
      const cargado = cdp.esperarEvento("Page.loadEventFired", sessionId);
      await cdp.enviar("Page.navigate", { url: doc.url }, sessionId);
      await cargado;
      const { data } = await cdp.enviar(
        "Page.printToPDF",
        {
          printBackground: true,
          preferCSSPageSize: false,
          paperWidth: 8.27,
          paperHeight: 11.69,
          ...MARGENES,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate: pieDePagina(doc.titulo),
        },
        sessionId,
      );
      await writeFile(doc.pdf, Buffer.from(data, "base64"));
      await cdp.enviar("Target.closeTarget", { targetId });
      console.log(`  PDF generado: ${doc.pdf}`);
    }

    await cdp.enviar("Browser.close").catch(() => {});
    cdp.cerrar();
  } finally {
    proceso.kill();
  }
}

async function imprimirSimple(navegador, documentos) {
  for (const doc of documentos) {
    await new Promise((resolver, rechazar) => {
      const proceso = spawn(
        navegador,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-pdf-header-footer",
          `--user-data-dir=${join(tmpdir(), "aiquaa-pdf-profile-simple")}`,
          `--print-to-pdf=${doc.pdf}`,
          doc.url,
        ],
        { stdio: "ignore" },
      );
      proceso.on("exit", (codigo) =>
        codigo === 0 ? resolver() : rechazar(new Error(`Chrome salió con código ${codigo}.`)),
      );
    });
    console.log(`  PDF generado (sin pie de página): ${doc.pdf}`);
  }
}

async function main() {
  const filtro = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
  const grupos = (await cargarGrupos()).filter((g) => filtro.length === 0 || filtro.includes(g.n));
  if (grupos.length === 0) throw new Error("No hay grupos para generar.");

  await mkdir(HTML_DIR, { recursive: true });

  const logoDataUri = await cargarLogoDataUri();
  const metaConLogo = { ...META, logoDataUri };

  const documentos = [];
  for (const g of grupos) {
    const html = renderDocumento(g, COMUN, metaConLogo);
    const rutaHtml = join(HTML_DIR, `${g.slug}.html`);
    await writeFile(rutaHtml, html, "utf8");
    documentos.push({
      url: pathToFileURL(rutaHtml).href,
      pdf: join(OUT, `${g.slug}.pdf`),
      titulo: `Grupo ${g.n} — ${g.titulo} · Requerimientos funcionales v${META.version}`,
    });
    console.log(`HTML generado: ${rutaHtml}`);
  }

  const headerTemplate = cabeceraDePagina(logoDataUri);
  const navegador = buscarNavegador();
  try {
    await imprimirConDevtools(navegador, documentos, headerTemplate);
  } catch (e) {
    console.warn(`Canal DevTools no disponible (${e.message}); usando --print-to-pdf.`);
    await imprimirSimple(navegador, documentos);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
