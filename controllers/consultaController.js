const axios = require("axios")
const db = require("../db")
const { crearConversacion, guardarMensaje } = require("./historialController")
 
/* =========================
TRADUCTOR
========================= */
async function traducir(texto, from = "en", to = "es") {
  try {
    const res = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texto,
        source: from,
        target: to,
        format: "text"
      })
    })
 
    const data = await res.json()
 
    return data.translatedText
      ? data.translatedText.toLowerCase().trim()
      : null
 
  } catch (error) {
    console.error("Error traduciendo:", error)
    return null
  }
}
 
/* =========================
HELPERS
========================= */
const obtenerCampo = (campo) => campo?.[0] || ""
 
const traducirCampo = async (valor, from, to) => {
  if (!valor) return ""
  return await traducir(valor, from, to)
}
 
/* =========================
CONSULTAR API OPENFDA
========================= */
async function consultarAPI(nombre) {
  try {
    const response = await axios.get(
      "https://api.fda.gov/drug/label.json",
      {
        params: {
          search: `openfda.generic_name:${nombre}`,
          limit: 1
        }
      }
    )
    return response.data
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { results: [] }
    }
    throw error
  }
}
 
/* =========================
BUSCAR MEDICAMENTO EN BD
========================= */
async function buscarMedicamentoBD(nombre) {
  const value = `%${nombre.toLowerCase()}%`
  const query = `
    SELECT *
    FROM medicamentos
    WHERE LOWER(generic_name_en) ILIKE $1
       OR LOWER(generic_name_es) ILIKE $1
    LIMIT 1
  `
  const result = await db.query(query, [value])
  return result.rows[0] || null
}
 
/* =========================
GUARDAR MEDICAMENTO
========================= */
async function guardarMedicamento(result) {
  const generic_en = obtenerCampo(result.openfda?.generic_name).toLowerCase()
 
  const data = {
    generic_name_en: generic_en,
    generic_name_es: await traducirCampo(generic_en, "en", "es"),
 
    product_type_en: obtenerCampo(result.openfda?.product_type),
    route_en:        obtenerCampo(result.openfda?.route),
    pharm_en:        obtenerCampo(result.openfda?.pharm_class_epc),
 
    indications_en: obtenerCampo(result.indications_and_usage),
    dosage_en:      obtenerCampo(result.dosage_and_administration),
    warnings_en:    obtenerCampo(result.warnings),
 
    do_not_use_en: obtenerCampo(result.do_not_use),
    ask_doctor_en: obtenerCampo(result.ask_doctor),
    stop_use_en:   obtenerCampo(result.stop_use),
 
    keep_en: obtenerCampo(result.keep_out_of_reach_of_children),
    preg_en: obtenerCampo(result.pregnancy_or_breast_feeding),
    spl_en:  obtenerCampo(result.spl_unclassified_section)
  }
 
  data.product_type_es = await traducirCampo(data.product_type_en, "en", "es")
  data.route_es        = await traducirCampo(data.route_en,        "en", "es")
  data.pharm_es        = await traducirCampo(data.pharm_en,        "en", "es")
  data.indications_es  = await traducirCampo(data.indications_en,  "en", "es")
  data.dosage_es       = await traducirCampo(data.dosage_en,       "en", "es")
  data.warnings_es     = await traducirCampo(data.warnings_en,     "en", "es")
  data.do_not_use_es   = await traducirCampo(data.do_not_use_en,   "en", "es")
  data.ask_doctor_es   = await traducirCampo(data.ask_doctor_en,   "en", "es")
  data.stop_use_es     = await traducirCampo(data.stop_use_en,     "en", "es")
  data.keep_es         = await traducirCampo(data.keep_en,         "en", "es")
  data.preg_es         = await traducirCampo(data.preg_en,         "en", "es")
  data.spl_es          = await traducirCampo(data.spl_en,          "en", "es")
 
  const query = `
    INSERT INTO medicamentos(
      generic_name_en, generic_name_es,
      product_type_en, product_type_es,
      route_en, route_es,
      pharm_class_epc_en, pharm_class_epc_es,
      indications_and_usage_en, indications_and_usage_es,
      dosage_and_administration_en, dosage_and_administration_es,
      warnings_en, warnings_es,
      do_not_use_en, do_not_use_es,
      ask_doctor_en, ask_doctor_es,
      stop_use_en, stop_use_es,
      keep_out_of_reach_of_children_en, keep_out_of_reach_of_children_es,
      pregnancy_or_breast_feeding_en, pregnancy_or_breast_feeding_es,
      spl_unclassified_section_en, spl_unclassified_section_es
    )
    VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26
    )
    ON CONFLICT (generic_name_en) DO NOTHING
    RETURNING *
  `
 
  const values = [
    data.generic_name_en, data.generic_name_es,
    data.product_type_en, data.product_type_es,
    data.route_en,        data.route_es,
    data.pharm_en,        data.pharm_es,
    data.indications_en,  data.indications_es,
    data.dosage_en,       data.dosage_es,
    data.warnings_en,     data.warnings_es,
    data.do_not_use_en,   data.do_not_use_es,
    data.ask_doctor_en,   data.ask_doctor_es,
    data.stop_use_en,     data.stop_use_es,
    data.keep_en,         data.keep_es,
    data.preg_en,         data.preg_es,
    data.spl_en,          data.spl_es
  ]
 
  const { rows } = await db.query(query, values)
 
  if (rows.length > 0) return rows[0]
 
  const existente = await db.query(
    `SELECT * FROM medicamentos WHERE generic_name_en = $1 LIMIT 1`,
    [data.generic_name_en]
  )
  return existente.rows[0]
}
 
/* =========================
OBTENER MEDICAMENTO (BD + API)
========================= */
async function obtenerMedicamento(medicamento, idioma) {
  let med = await buscarMedicamentoBD(medicamento)
  if (med) return med
 
  let nombreEn = medicamento.toLowerCase()
 
  if (idioma === "es") {
    const traducido = await traducir(medicamento, "es", "en")
    if (traducido && traducido !== nombreEn) {
      nombreEn = traducido
    }
  }
 
  const apiData = await consultarAPI(nombreEn)
 
  if (!apiData.results || apiData.results.length === 0) {
    return null
  }
 
  return await guardarMedicamento(apiData.results[0])
}
 
/* =========================
TRADUCIR PARA MOSTRAR
========================= */
async function traducirCampos(med, lang) {
 
  const dividirTexto = (texto) => {
    if (!texto) return []
    return texto
      .replace(/dosage and administration/gi, "")
      .replace(/warnings?/gi, "")
      .replace(/indications and usage/gi, "")
      .replace(/\n+/g, " ")
      .split(/\.\s+|\n/)
      .map(t => t.trim())
      .filter(t => t.length > 15)
  }
 
  if (lang === "en") {
    return {
      nombre: med.generic_name_en,
      general: [
        `Type: ${med.product_type_en || ""}`,
        `Route: ${med.route_en || ""}`,
        `Pharmacological class: ${med.pharm_class_epc_en || ""}`
      ].filter(item => {
        const val = item.split(":")[1]?.trim()
        return val && val.length > 0
      }),
      indicaciones: dividirTexto(med.indications_and_usage_en),
      dosificacion: dividirTexto(med.dosage_and_administration_en),
      advertencias: dividirTexto(med.warnings_en),
      especial: [
        med.do_not_use_en,
        med.ask_doctor_en,
        med.stop_use_en,
        med.keep_out_of_reach_of_children_en,
        med.pregnancy_or_breast_feeding_en,
        med.spl_unclassified_section_en
      ].filter(Boolean).flatMap(dividirTexto)
    }
  }
 
  return {
    nombre: med.generic_name_es || med.generic_name_en,
    general: [
      `Tipo: ${med.product_type_es || ""}`,
      `Vía: ${med.route_es || ""}`,
      `Clase farmacológica: ${med.pharm_class_epc_es || ""}`
    ].filter(item => {
      const val = item.split(":")[1]?.trim()
      return val && val.length > 0
    }),
    indicaciones: dividirTexto(med.indications_and_usage_es),
    dosificacion: dividirTexto(med.dosage_and_administration_es),
    advertencias: dividirTexto(med.warnings_es),
    especial: [
      med.do_not_use_es,
      med.ask_doctor_es,
      med.stop_use_es,
      med.keep_out_of_reach_of_children_es,
      med.pregnancy_or_breast_feeding_es,
      med.spl_unclassified_section_es
    ].filter(Boolean).flatMap(dividirTexto)
  }
}
 
/* =========================
MANEJO DE CONVERSACIÓN
========================= */
async function manejarConversacion({ usuarioId, medicamentoId, titulo }) {
  // Siempre crear conversación nueva — cada búsqueda es independiente
  return await crearConversacion(usuarioId, medicamentoId, titulo)
}
 
/* =========================
CONTROLADOR PRINCIPAL
========================= */
const consultarMedicamento = async (req, res) => {
  try {
    const { medicamento, filtros, conversacionId } = req.body
    const usuarioId = req.usuario.id
    const idioma = req.usuario.idioma === "English" ? "en" : "es"
 
    // Validación básica
    if (!medicamento || typeof medicamento !== "string" || medicamento.trim() === "") {
      return res.status(400).json({ error: "Nombre de medicamento inválido" })
    }
 
    if (!Array.isArray(filtros) || filtros.length === 0) {
      return res.status(400).json({ error: "Debes seleccionar al menos un filtro" })
    }
 
    const med = await obtenerMedicamento(medicamento.trim(), idioma)
 
    if (!med) {
      return res.json({ encontrado: false })
    }
 
    const dataTraducida = await traducirCampos(med, idioma)
 
    // Construir contenido solo con filtros que tienen datos
    const contenido = {}
    filtros.forEach(f => {
      if (Array.isArray(dataTraducida[f]) && dataTraducida[f].length > 0) {
        contenido[f] = dataTraducida[f]
      }
    })
 
    const conversacion = await manejarConversacion({
      usuarioId,
      medicamentoId: med.id,
      titulo: dataTraducida.nombre
    })
 
    await guardarMensaje(conversacion.id, dataTraducida.nombre, true)
    await guardarMensaje(conversacion.id, JSON.stringify(contenido), false)
 
    // ✅ nombre incluido en respuesta para que el frontend lo use directamente
    res.json({
      encontrado: true,
      nombre: dataTraducida.nombre,
      contenido,
      conversacionId: conversacion.id
    })
 
  } catch (error) {
    console.error("Error en consultarMedicamento:", error)
    res.status(500).json({ error: "Error consultando medicamento" })
  }
}
 
module.exports = { consultarMedicamento }