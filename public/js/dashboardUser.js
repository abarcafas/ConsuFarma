const input = document.getElementById("medicamentoInput")
const boton = document.getElementById("enviarBtn")
const chat = document.getElementById("chatContainer")
const inputContainer = document.getElementById("inputContainer")
const mensajeInicio = document.getElementById("mensajeInicio")

let conversacionId = null
let filtrosSeleccionados = []
let estadoInicialHTML = ""
// idioma desde JWT (inyectado en EJS)
const idioma = idiomaUsuario === "English" ? "en" : "es"

/* =========================
TRADUCCIONES
========================= */
const traducciones = {
  es:{
    tituloInicio:"Selecciona primero una categoría",
    subtituloInicio:"Luego escribe el medicamento",
    general:"Info general",
    indicaciones:"Indicaciones",
    dosificacion:"Dosificación",
    advertencias:"Advertencias",
    especial:"Información especial",
    placeholder:"Escribe un medicamento...",
    consultando:"Consultando...",
    error:"Error consultando medicamento",
    seleccionaFiltro:"Selecciona al menos un filtro",
    noEncontrado:"Medicamento no encontrado",
    historial:"Historial de búsqueda",
    asistente:"Asistente de medicamentos",
    enviar:"Enviar",
    nuevaConversacion:"➕ Nueva conversación"
  },
  en:{
    tituloInicio:"Select a category first",
    subtituloInicio:"Then type the medicine",
    general:"General info",
    indicaciones:"Indications",
    dosificacion:"Dosage",
    advertencias:"Warnings",
    especial:"Special information",
    placeholder:"Type a medicine...",
    consultando:"Consulting...",
    error:"Error consulting medicine",
    seleccionaFiltro:"Select at least one filter",
    noEncontrado:"Medicine not found",
    historial:"Search history",
    asistente:"Medicine assistant",
    enviar:"Send",
    nuevaConversacion:"➕ New conversation"
  }
}

/* =========================
UTILS UI
========================= */

const t = () => traducciones[idioma]

function scrollChat(){
  chat.scrollTop = chat.scrollHeight
}

function ocultarMensajeInicio(){
  if(mensajeInicio) mensajeInicio.style.display = "none"
}

/* =========================
IDIOMA UI
========================= */
function aplicarIdioma(){

  const txt = t()

  document.getElementById("tituloInicio").innerText = txt.tituloInicio
  document.getElementById("subtituloInicio").innerText = txt.subtituloInicio

  document.getElementById("filtroGeneral").innerText = txt.general
  document.getElementById("filtroIndicaciones").innerText = txt.indicaciones
  document.getElementById("filtroDosificacion").innerText = txt.dosificacion
  document.getElementById("filtroAdvertencias").innerText = txt.advertencias
  document.getElementById("filtroEspecial").innerText = txt.especial

  document.getElementById("historialTitulo").textContent = txt.historial
  document.getElementById("subtituloHeader").textContent = txt.asistente
  boton.textContent = txt.enviar
  input.placeholder = txt.placeholder
}

/* =========================
FILTROS
========================= */
function toggleFiltro(filtro, boton){

  if(filtrosSeleccionados.includes(filtro)){
    filtrosSeleccionados = filtrosSeleccionados.filter(f => f !== filtro)
    boton.classList.remove("filtro-activo")
  }else{
    filtrosSeleccionados.push(filtro)
    boton.classList.add("filtro-activo")
  }

  inputContainer.style.display =
    filtrosSeleccionados.length > 0 ? "flex" : "none"
}

function seleccionarFiltro(filtro, boton){
  toggleFiltro(filtro, boton)
}

/* =========================
MENSAJES
========================= */

function crearMensajeWrapper(esUsuario){
  const div = document.createElement("div")
  div.className = esUsuario
    ? "flex justify-end animate-fadeIn"
    : "flex animate-fadeIn"
  return div
}

function agregarMensajeUsuario(texto){

  ocultarMensajeInicio()

  const div = crearMensajeWrapper(true)

  div.innerHTML = `
  <div class="bg-[#e8f5f0] border border-[#1a7a5e]/20 px-4 py-3 rounded-2xl max-w-sm shadow">
    ${texto}
  </div>
  `

  chat.appendChild(div)
  scrollChat()
}

function agregarMensajeBot(html){

  ocultarMensajeInicio()

  const div = crearMensajeWrapper(false)

  div.innerHTML = `
  <div class="bg-white border border-gray-200 px-4 py-3 rounded-2xl max-w-md shadow-sm">
    ${html}
  </div>
  `

  chat.appendChild(div)
  scrollChat()
}

function eliminarUltimoMensaje(){
  if(chat.lastChild){
    chat.removeChild(chat.lastChild)
  }
}

/* =========================
FORMATEAR RESPUESTA
========================= */

function generarHTMLDesdeJSON(data){

  let html = ""

  for(const key in data){

    const lista = data[key]

    if(!Array.isArray(lista) || lista.length === 0) continue

    html += `
    <div style="margin-bottom:20px">
      <div style="font-weight:700;color:#135c47;margin-bottom:4px">
        ${key.toUpperCase()}
      </div>
      <div style="font-size:14px;line-height:1.5">
        ${lista.map(item => `<div>• ${item}</div>`).join("")}
      </div>
    </div>
    `
  }

  return html
}

/* =========================
API
========================= */

async function fetchConsulta(payload){
  const res = await fetch("/consultar",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  })

  return await res.json()
}

/* =========================
CONSULTA PRINCIPAL
========================= */

async function enviarConsulta(){

  const medicamento = input.value.trim()

  if(!medicamento) return

  if(filtrosSeleccionados.length === 0){
    return agregarMensajeBot(t().seleccionaFiltro)
  }

  agregarMensajeUsuario(medicamento)
  input.value = ""
  agregarMensajeBot(t().consultando)

  try{

    const data = await fetchConsulta({
      medicamento,
      filtros: filtrosSeleccionados,
      conversacionId
    })

    if(data.conversacionId){
      conversacionId = data.conversacionId
    }

    eliminarUltimoMensaje()

    if(!data.encontrado){
      return agregarMensajeBot(t().noEncontrado)
    }

    const html = generarHTMLDesdeJSON(data.contenido)
    agregarMensajeBot(html)

  } catch (error){

    eliminarUltimoMensaje()
    agregarMensajeBot(t().error)

  }
}

/* =========================
HISTORIAL
========================= */

async function cargarHistorial(){

  const res = await fetch('/api/historial')
  const data = await res.json()

  // 🔥 usar el contenedor interno
  const sidebarContent = document.getElementById('sidebar-content')

  // 🔥 pintar header + botón
 sidebarContent.innerHTML = `
  <div class="sticky top-0 bg-white pb-2 z-10">

    <button id="nuevaConversacionBtn"
    class="nueva-conv-btn mb-3">
      ${t().nuevaConversacion}
    </button>

    <h3 class="text-[10px] font-bold uppercase text-[#5a7a6e] px-2 pt-1 pb-3">
      ${t().historial}
    </h3>

  </div>
`

  // 🔥 evento botón
  document.getElementById("nuevaConversacionBtn")
    .addEventListener("click", nuevaConversacion)

  // 🔥 AQUÍ VA appendChild 👇
  data.forEach(conv => {

    const item = document.createElement('div')
    item.className = "p-2 cursor-pointer hover:bg-gray-100 rounded"
    item.innerText = conv.titulo

    item.onclick = () => cargarConversacion(conv.id)

    // 🔥 IMPORTANTE
    sidebarContent.appendChild(item)

  })
}
/* =========================
CARGAR CONVERSACIÓN
========================= */

async function cargarConversacion(id){

  const res = await fetch(`/api/historial/${id}`)
  const mensajes = await res.json()

  conversacionId = id
  chat.innerHTML = ""

  mensajes.forEach(m => {

    const div = crearMensajeWrapper(m.es_usuario)

    if(m.es_usuario){

      div.innerHTML = `
      <div class="bg-[#e8f5f0] border border-[#1a7a5e]/20 px-4 py-3 rounded-2xl max-w-sm shadow">
        ${m.contenido}
      </div>
      `

    }else{

      let html = ""

      try {
        const data = JSON.parse(m.contenido)
        html = generarHTMLDesdeJSON(data)
      } catch {
        html = m.contenido
      }

      div.innerHTML = `
      <div class="bg-white border border-gray-200 px-4 py-3 rounded-2xl max-w-md shadow-sm">
        ${html}
      </div>
      `
    }

    chat.appendChild(div)
  })

  scrollChat()
}

/* =========================
EVENTOS
========================= */

boton.addEventListener("click", enviarConsulta)

input.addEventListener("keypress", e => {
  if(e.key === "Enter") enviarConsulta()
})

/* =========================
INIT
========================= */

function init(){
  aplicarIdioma()
  inputContainer.style.display = "none"
  cargarHistorial()
}

init()

function nuevaConversacion(){

  conversacionId = null
  filtrosSeleccionados = []

  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.classList.remove("filtro-activo")
  })

  inputContainer.style.display = "none"
  input.value = ""

  // 🔥 VOLVER A PINTAR TODO (texto + filtros)
  chat.innerHTML = `
  
  <div class="text-center py-10 px-4 m-auto max-w-sm">
    <h2 class="font-['Playfair_Display',serif] text-2xl text-[#135c47] mb-2">
      ${t().tituloInicio}
    </h2>
    <p class="text-sm text-[#5a7a6e]">
      ${t().subtituloInicio}
    </p>
  </div>

  <div class="bg-white rounded-2xl p-5 shadow-lg max-w-md">

    <div class="grid grid-cols-2 gap-2 mt-3">

      <button onclick="seleccionarFiltro('general',this)" class="filtro-btn">
        📋 <span>${t().general}</span>
      </button>

      <button onclick="seleccionarFiltro('indicaciones',this)" class="filtro-btn">
        🩺 <span>${t().indicaciones}</span>
      </button>

      <button onclick="seleccionarFiltro('dosificacion',this)" class="filtro-btn">
        💉 <span>${t().dosificacion}</span>
      </button>

      <button onclick="seleccionarFiltro('advertencias',this)" class="filtro-btn">
        ⚠️ <span>${t().advertencias}</span>
      </button>

    </div>

    <button onclick="seleccionarFiltro('especial',this)"
    class="filtro-btn w-full mt-2">
      ✨ <span>${t().especial}</span>
    </button>

  </div>
  `
}
