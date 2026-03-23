const input = document.getElementById("medicamentoInput")
const boton = document.getElementById("enviarBtn")
const chat = document.getElementById("chatContainer")
const inputContainer = document.getElementById("inputContainer")
const mensajeInicio = document.getElementById("mensajeInicio")

let filtrosSeleccionados = []

// idioma desde JWT (inyectado en EJS)
const idioma = idiomaUsuario === "English" ? "en" : "es"

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
enviar:"Enviar"
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
enviar:"Send"
}

}

function aplicarIdioma(id){

const t = traducciones[id]

document.getElementById("tituloInicio").innerText = t.tituloInicio
document.getElementById("subtituloInicio").innerText = t.subtituloInicio

document.getElementById("filtroGeneral").innerText = t.general
document.getElementById("filtroIndicaciones").innerText = t.indicaciones
document.getElementById("filtroDosificacion").innerText = t.dosificacion
document.getElementById("filtroAdvertencias").innerText = t.advertencias
document.getElementById("filtroEspecial").innerText = t.especial

document.getElementById("historialTitulo").textContent = t.historial
document.getElementById("subtituloHeader").textContent = t.asistente
document.getElementById("enviarBtn").textContent = t.enviar
input.placeholder = t.placeholder

}

aplicarIdioma(idioma)

// ocultar input al inicio
inputContainer.style.display = "none"


function seleccionarFiltro(filtro, boton){

if(filtrosSeleccionados.includes(filtro)){

filtrosSeleccionados = filtrosSeleccionados.filter(f => f !== filtro)
boton.classList.remove("filtro-activo")

}else{

filtrosSeleccionados.push(filtro)
boton.classList.add("filtro-activo")

}

// mostrar input solo si hay filtros
if(filtrosSeleccionados.length > 0){
inputContainer.style.display = "flex"
}else{
inputContainer.style.display = "none"
}

}


// mensaje usuario
function agregarMensajeUsuario(texto){

if(mensajeInicio) mensajeInicio.style.display="none"

const div = document.createElement("div")

div.className="flex justify-end animate-fadeIn"

div.innerHTML = `
<div class="bg-[#e8f5f0] border border-[#1a7a5e]/20 px-4 py-3 rounded-2xl max-w-sm shadow">
${texto}
</div>
`

chat.appendChild(div)

scrollChat()

}


// mensaje bot
function agregarMensajeBot(html){

if(mensajeInicio) mensajeInicio.style.display="none"

const div = document.createElement("div")

div.className="flex animate-fadeIn"

div.innerHTML = `
<div class="bg-white border border-gray-200 px-4 py-3 rounded-2xl max-w-md shadow-sm">
${html}
</div>
`

chat.appendChild(div)

scrollChat()

}


// auto scroll
function scrollChat(){

chat.scrollTop = chat.scrollHeight

}



async function enviarConsulta(){

const medicamento = input.value.trim()

if(!medicamento) return


if(filtrosSeleccionados.length === 0){

agregarMensajeBot(traducciones[idioma].seleccionaFiltro)

return

}


agregarMensajeUsuario(medicamento)

input.value=""

agregarMensajeBot(traducciones[idioma].consultando)

try{

const response = await fetch("/consultar",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

medicamento,
filtros:filtrosSeleccionados

})

})

const data = await response.json()

// quitar mensaje "consultando"
chat.removeChild(chat.lastChild)


if(!data.encontrado){

agregarMensajeBot(traducciones[idioma].noEncontrado)

return

}


// respuesta del bot
agregarMensajeBot(data.contenido)

}catch(err){

chat.removeChild(chat.lastChild)

agregarMensajeBot(traducciones[idioma].error)

}

}



boton.addEventListener("click", enviarConsulta)

input.addEventListener("keypress", e => {

if(e.key === "Enter") enviarConsulta()

})

async function cargarHistorial() {

  const res = await fetch('/api/historial')
  const data = await res.json()

  const sidebar = document.getElementById('sidebar')

  // 🔥 LIMPIAR Y VOLVER A PONER EL TÍTULO
  sidebar.innerHTML = `
  <h3 id="historialTitulo" class="text-[10px] font-bold uppercase text-[#5a7a6e] px-2 pt-1 pb-3">
    ${traducciones[idioma].historial}
  </h3>
  `

  // 🔁 AGREGAR HISTORIAL
  data.forEach(conv => {
    const item = document.createElement('div')
    item.className = "p-2 cursor-pointer hover:bg-gray-100 rounded"
    item.innerText = conv.titulo

    item.onclick = () => cargarConversacion(conv.id)

    sidebar.appendChild(item)
  })
}
async function cargarConversacion(id) {
  const res = await fetch(`/api/historial/${id}`)
  const mensajes = await res.json()

  const chat = document.getElementById('chatContainer')
  chat.innerHTML = ""

  mensajes.forEach(m => {
    const div = document.createElement('div')
    div.className = m.es_usuario ? "user-msg" : "bot-msg"
    div.innerHTML = m.contenido

    chat.appendChild(div)
  })
}
cargarHistorial()