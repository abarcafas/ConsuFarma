/* =========================
  CONFIG
========================= */
const idioma = (typeof idiomaUsuario !== 'undefined' && idiomaUsuario === "English") ? "en" : "es"

const input        = document.getElementById("medicamentoInput")
const boton        = document.getElementById("enviarBtn")
const infoPanel    = document.getElementById("infoPanel")
const sidebarInner = document.getElementById("sidebar-inner")

let conversacionId       = null
let filtrosSeleccionados = []
let nombreMedActivo      = ""

/* =========================
  TRADUCCIONES
========================= */
const traducciones = {
  es: {
    tituloInicio:    "Selecciona una categoría y busca",
    subtituloInicio: "La información aparecerá aquí",
    general:         "Info general",
    indicaciones:    "Indicaciones",
    dosificacion:    "Dosificación",
    advertencias:    "Advertencias",
    especial:        "Info especial",
    placeholder:     "Busca un medicamento, principio activo o marca...",
    buscando:        "Consultando...",
    error:           "Error al consultar el medicamento. Intenta de nuevo.",
    sinFiltro:       "Selecciona al menos una categoría antes de buscar.",
    noEncontrado:    "Medicamento no encontrado",
    noEncontradoSub: "Verifica el nombre e intenta de nuevo.",
    historial:       "Historial reciente",
    asistente:       "Asistente de medicamentos",
    enviar:          "Buscar",
    nueva:           "Nueva consulta",
    notaPie:         "Esta información es educativa. Consulte siempre a su médico o farmacéutico.",
    selCategoria:    "Selecciona una categoría",
    heroTitulo:      "Consulta cualquier medicamento",
    heroSub:         "Información confiable al instante — dosificación, efectos e indicaciones"
  },
  en: {
    tituloInicio:    "Select a category and search",
    subtituloInicio: "The information will appear here",
    general:         "General info",
    indicaciones:    "Indications",
    dosificacion:    "Dosage",
    advertencias:    "Warnings",
    especial:        "Special info",
    placeholder:     "Search for a medicine, active ingredient or brand...",
    buscando:        "Consulting...",
    error:           "Error consulting medicine. Please try again.",
    sinFiltro:       "Select at least one category before searching.",
    noEncontrado:    "Medicine not found",
    noEncontradoSub: "Check the name and try again.",
    historial:       "Recent history",
    asistente:       "Medicine assistant",
    enviar:          "Search",
    nueva:           "New search",
    notaPie:         "This information is educational. Always consult your doctor or pharmacist.",
    selCategoria:    "Select a category",
    heroTitulo:      "Look up any medication",
    heroSub:         "Reliable information instantly — dosage, effects and indications"
  }
}

const t = () => traducciones[idioma]

/* =========================
  APLICAR IDIOMA
========================= */
function aplicarIdioma() {
  const tx = t()
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }

  set("subtituloHeader", tx.asistente)
  set("heroLabel",       tx.selCategoria)

  if (input) input.placeholder = tx.placeholder
  if (boton) boton.textContent  = tx.enviar

  const heroMap = {
    "heroPill-general":      tx.general,
    "heroPill-indicaciones": tx.indicaciones,
    "heroPill-dosificacion": tx.dosificacion,
    "heroPill-advertencias": tx.advertencias,
    "heroPill-especial":     tx.especial
  }
  Object.entries(heroMap).forEach(([id, val]) => {
    const el = document.getElementById(id)
    if (el) { const span = el.querySelector("span"); if (span) span.textContent = val }
  })
}

/* =========================
  FILTROS
========================= */
function toggleHeroPill(filtro, btn) {
  if (filtrosSeleccionados.includes(filtro)) {
    filtrosSeleccionados = filtrosSeleccionados.filter(f => f !== filtro)
    btn?.classList.remove("activo")
  } else {
    filtrosSeleccionados.push(filtro)
    btn?.classList.add("activo")
  }
}

/* =========================
  RENDER: ESTADO VACÍO
========================= */
function mostrarEstadoVacio() {
  infoPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#7A9E8C;text-align:center;">
      <div>
        <div style="font-size:48px;margin-bottom:12px;">💊</div>
        <strong style="display:block;font-family:'Playfair Display',serif;font-size:20px;color:#0D3D2E;margin-bottom:6px;">
          ${t().tituloInicio}
        </strong>
        <span style="font-size:14px;color:#7A9E8C;">${t().subtituloInicio}</span>
      </div>
    </div>
  `
}

/* =========================
  RENDER: LOADING
========================= */
function mostrarLoading() {
  infoPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:200px;gap:12px;">
      <div class="spinner"></div>
      <span style="font-size:14px;color:#7A9E8C;">${t().buscando}</span>
    </div>
  `
}

/* =========================
  RENDER: MENSAJE
========================= */
function mostrarMensaje(titulo, subtitulo = "", tipo = "info") {
  const color = tipo === "error" ? "#A32D2D" : "#0D3D2E"
  const icono = tipo === "error" ? "❌" : "🔍"
  infoPanel.innerHTML = `
    <div style="text-align:center;padding:48px 24px;color:#7A9E8C;">
      <div style="font-size:40px;margin-bottom:12px;">${icono}</div>
      <strong style="display:block;font-size:16px;font-weight:800;color:${color};margin-bottom:6px;">${titulo}</strong>
      ${subtitulo ? `<p style="font-size:14px;margin-top:4px;">${subtitulo}</p>` : ""}
    </div>
  `
}

/* =========================
  RENDER: CARD MEDICAMENTO
========================= */
function renderizarMedicamento(nombre, contenido) {

  // Badge: derivado de las keys del contenido, no de filtrosSeleccionados
  const badge = Object.keys(contenido)
    .filter(f => Array.isArray(contenido[f]) && contenido[f].length > 0)
    .map(f => t()[f] || f)
    .join(" · ")

  // Extraer clase farmacológica para subtítulo del header
  let claseText = ""
  if (contenido.general?.length) {
    const claseItem = contenido.general.find(g =>
      g.toLowerCase().startsWith("clase") ||
      g.toLowerCase().startsWith("class") ||
      g.toLowerCase().startsWith("pharmacol")
    )
    if (claseItem) {
      claseText = claseItem.split(":").slice(1).join(":").trim()
    }
  }

  // ── GENERAL ──
  let htmlGeneral = ""
  if (contenido.general?.length) {
    const chips = contenido.general.map(item => {
      const colonIdx = item.indexOf(":")
      const label = colonIdx > -1 ? item.slice(0, colonIdx).trim() : ""
      const valor = colonIdx > -1 ? item.slice(colonIdx + 1).trim() : item
      return `
        <div class="general-chip">
          <div class="chip-label">${label}</div>
          <div class="chip-valor">${valor || "—"}</div>
        </div>
      `
    }).join("")
    htmlGeneral = `
      <div>
        <div class="seccion-titulo">${t().general}</div>
        <div class="general-grid">${chips}</div>
      </div>
    `
  }

  // ── INDICACIONES ──
  let htmlIndicaciones = ""
  if (contenido.indicaciones?.length) {
    htmlIndicaciones = renderLista(t().indicaciones, contenido.indicaciones)
  }

  // ── DOSIFICACIÓN ──
  let htmlDosificacion = ""
  if (contenido.dosificacion?.length) {
    const clases = ["bloque-verde", "bloque-amber", "bloque-rojo"]
    const bloques = contenido.dosificacion.map((item, i) =>
      `<div class="bloque ${clases[Math.min(i, clases.length - 1)]}"><p class="bloque-texto">${item}</p></div>`
    ).join("")
    htmlDosificacion = `
      <div>
        <div class="seccion-titulo">${t().dosificacion}</div>
        ${bloques}
      </div>
    `
  }

  // ── ADVERTENCIAS ──
  let htmlAdvertencias = ""
  if (contenido.advertencias?.length) {
    const items = contenido.advertencias
    if (items.length >= 2) {
      const mitad = Math.ceil(items.length / 2)
      htmlAdvertencias = `
        <div>
          <div class="seccion-titulo">${t().advertencias}</div>
          <div class="fila-doble">
            <div>${items.slice(0, mitad).map(item => `<div class="bloque bloque-rojo"><p class="bloque-texto">${item}</p></div>`).join("")}</div>
            <div>${items.slice(mitad).map(item => `<div class="bloque bloque-amber"><p class="bloque-texto">${item}</p></div>`).join("")}</div>
          </div>
        </div>
      `
    } else {
      htmlAdvertencias = renderBloques(t().advertencias, items, "bloque-rojo")
    }
  }

  // ── ESPECIAL ──
  let htmlEspecial = ""
  if (contenido.especial?.length) {
    htmlEspecial = renderLista(t().especial, contenido.especial)
  }

  const cuerpo = [htmlGeneral, htmlIndicaciones, htmlDosificacion, htmlAdvertencias, htmlEspecial]
    .filter(Boolean).join("")

  infoPanel.innerHTML = `
    <div id="medCard">
      <div class="card-header">
        <div class="card-header-info">
          <h2>${capitalize(nombre)}</h2>
          ${claseText ? `<p>${claseText}</p>` : ""}
        </div>
        <div class="card-badge">${badge}</div>
      </div>
      <div class="card-body">
        ${cuerpo || `<p style="color:#7A9E8C;font-size:14px;">Sin información disponible para los filtros seleccionados.</p>`}
        <div class="nota-pie">${t().notaPie}</div>
      </div>
    </div>
  `
}

function renderLista(titulo, items) {
  return `
    <div>
      <div class="seccion-titulo">${titulo}</div>
      <ul class="item-lista">
        ${items.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `
}

function renderBloques(titulo, items, clase = "bloque-verde") {
  return `
    <div>
      <div class="seccion-titulo">${titulo}</div>
      ${items.map(item => `<div class="bloque ${clase}"><p class="bloque-texto">${item}</p></div>`).join("")}
    </div>
  `
}

function capitalize(str) {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/* =========================
  API FETCH
========================= */
async function fetchConsulta(payload) {
  const res = await fetch("/consultar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `HTTP ${res.status}`)
  }

  return await res.json()
}

/* =========================
  CONSULTA PRINCIPAL
========================= */
async function enviarConsulta() {
  const medicamento = input.value.trim()
  if (!medicamento) return

  if (filtrosSeleccionados.length === 0) {
    mostrarMensaje(t().sinFiltro, "", "info")
    return
  }

  mostrarLoading()

  try {
    const data = await fetchConsulta({
      medicamento,
      filtros: filtrosSeleccionados,
      conversacionId
    })

    if (!data.encontrado) {
      mostrarMensaje(t().noEncontrado, t().noEncontradoSub, "info")
      return
    }

    // ✅ Usar nombre del backend (ya traducido correctamente)
    nombreMedActivo = data.nombre || medicamento
    renderizarMedicamento(nombreMedActivo, data.contenido)

    // Resetear input, filtros y pills para la próxima búsqueda
    input.value = ""
    filtrosSeleccionados = []
    document.querySelectorAll(".hero-pill").forEach(btn => btn.classList.remove("activo"))

    cargarHistorial()

  } catch (err) {
    console.error("Error en consulta:", err)
    mostrarMensaje(t().error, "", "error")
  }
}

/* =========================
  HISTORIAL
========================= */
async function cargarHistorial() {
  try {
    const res = await fetch("/api/historial")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    sidebarInner.innerHTML = ""

    // Botón nueva consulta
    const btnNueva = document.createElement("button")
    btnNueva.id = "nuevaConversacionBtn"
    btnNueva.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      ${t().nueva}
    `
    btnNueva.addEventListener("click", nuevaConsulta)
    sidebarInner.appendChild(btnNueva)

    // Label
    const label = document.createElement("div")
    label.className = "sidebar-label"
    label.textContent = t().historial
    sidebarInner.appendChild(label)

    if (!Array.isArray(data) || data.length === 0) {
      const vacio = document.createElement("div")
      vacio.style.cssText = "font-size:12px;color:#9CA3A0;padding:8px 8px;"
      vacio.textContent = idioma === "es" ? "Sin búsquedas aún" : "No searches yet"
      sidebarInner.appendChild(vacio)
      return
    }

    const dotColors = ["#1A5C42", "#C8973A", "#7A5A1A", "#0D3D2E", "#A32D2D"]

    data.forEach((conv, i) => {
      const item = document.createElement("div")
      item.className = "historial-item"
      if (conv.id === conversacionId) item.classList.add("activo")

      item.innerHTML = `
        <div class="historial-dot" style="background:${dotColors[i % dotColors.length]}"></div>
        <div class="historial-info">
          <div class="historial-titulo">${conv.titulo || "—"}</div>
          <div class="historial-meta">${formatearFecha(conv.created_at || conv.fecha)}</div>
        </div>
      `

      item.addEventListener("click", () => cargarConversacion(conv.id))
      sidebarInner.appendChild(item)
    })

  } catch (err) {
    console.error("Error cargando historial:", err)
    // No bloquear la UI si el historial falla
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return ""
  try {
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diff  = ahora - fecha
    const mins  = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias  = Math.floor(diff / 86400000)

    if (mins < 1)   return idioma === "es" ? "ahora mismo" : "just now"
    if (mins < 60)  return idioma === "es" ? `hace ${mins} min` : `${mins} min ago`
    if (horas < 24) return idioma === "es" ? `hace ${horas}h` : `${horas}h ago`
    if (dias === 1) return idioma === "es" ? "ayer" : "yesterday"
    return idioma === "es" ? `hace ${dias} días` : `${dias} days ago`
  } catch {
    return ""
  }
}

/* =========================
  CARGAR CONVERSACIÓN
========================= */
async function cargarConversacion(id) {
  try {
    mostrarLoading()

    const res = await fetch(`/api/historial/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const mensajes = await res.json()

    conversacionId = id

    // Último mensaje del bot y del usuario
    const botMsg  = [...mensajes].reverse().find(m => !m.es_usuario)
    const userMsg = [...mensajes].reverse().find(m => m.es_usuario)

    if (!botMsg) {
      mostrarEstadoVacio()
      return
    }

    // ✅ Parse robusto
    let contenido = {}
    try {
      const raw = typeof botMsg.contenido === "string"
        ? botMsg.contenido
        : JSON.stringify(botMsg.contenido)
      contenido = JSON.parse(raw)
    } catch {
      contenido = {}
    }

    const nombre = userMsg?.contenido || ""
    nombreMedActivo = nombre

    // No restaurar filtros — el usuario parte limpio para su próxima búsqueda
    filtrosSeleccionados = []
    document.querySelectorAll(".hero-pill").forEach(btn => btn.classList.remove("activo"))

    renderizarMedicamento(nombre, contenido)

    // Marcar activo en sidebar
    document.querySelectorAll(".historial-item").forEach(el => {
      el.classList.toggle("activo", el.dataset.convId === String(id))
    })

  } catch (err) {
    console.error("Error cargando conversación:", err)
    mostrarMensaje(t().error, "", "error")
  }
}

/* =========================
  NUEVA CONSULTA
========================= */
function nuevaConsulta() {
  conversacionId       = null
  filtrosSeleccionados = []
  nombreMedActivo      = ""

  document.querySelectorAll(".hero-pill").forEach(btn => btn.classList.remove("activo"))
  document.querySelectorAll(".historial-item").forEach(el => el.classList.remove("activo"))
  input.value = ""

  mostrarEstadoVacio()
}

/* =========================
  EVENTOS
========================= */
boton.addEventListener("click", enviarConsulta)

input.addEventListener("keypress", e => {
  if (e.key === "Enter") enviarConsulta()
})

/* =========================
  INIT
========================= */
function init() {
  aplicarIdioma()
  mostrarEstadoVacio()
  cargarHistorial()
}

init()