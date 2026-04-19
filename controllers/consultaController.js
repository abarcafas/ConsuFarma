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
  // Intentar primero por substance_name (más preciso para principios activos)
  const estrategias = [
    `openfda.substance_name:"${nombre}"`,
    `openfda.generic_name:"${nombre}"`,
    `openfda.substance_name:${nombre}`,
    `openfda.generic_name:${nombre}`,
  ]

  for (const search of estrategias) {
    try {
      const response = await axios.get(
        "https://api.fda.gov/drug/label.json",
        { params: { search, limit: 1 } }
      )
      if (response.data?.results?.length > 0) {
        console.log(`✅ OpenFDA encontró con: ${search}`)
        return response.data
      }
    } catch (error) {
      if (error.response?.status !== 404) throw error
    }
  }

  return { results: [] }
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
  // Preferir substance_name sobre generic_name — es más preciso para principios activos
  const substanceName = obtenerCampo(result.openfda?.substance_name).toLowerCase()
  const genericName   = obtenerCampo(result.openfda?.generic_name).toLowerCase()

  // Usar substance_name si existe, si no generic_name
  const generic_en = (substanceName || genericName).trim()

  if (!generic_en) {
    console.error("❌ No se pudo determinar el nombre genérico del medicamento")
    return null
  }

  console.log(`💊 Guardando medicamento: "${generic_en}"`)

  // Traducir nombre al español — reintentar si falla o devuelve lo mismo
  let generic_es = await traducirCampo(generic_en, "en", "es")
  if (!generic_es || generic_es.trim() === generic_en.trim()) {
    await new Promise(r => setTimeout(r, 500))
    generic_es = await traducirCampo(generic_en, "en", "es")
  }
  // Si sigue igual al inglés, guardar null — se mostrará el inglés como fallback en UI
  if (!generic_es || generic_es.trim() === generic_en.trim()) {
    console.log(`⚠️ Traducción falló para "${generic_en}", guardando null en _es`)
    generic_es = null
  }

  console.log(`🌐 Nombre en español: "${generic_es}"`)

  const data = {
    generic_name_en: generic_en,
    generic_name_es: generic_es,

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
VERIFICAR SI TRADUCTOR DISPONIBLE
========================= */
async function traductorDisponible() {
  try {
    const res = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "test", source: "en", target: "es", format: "text" })
    })
    const data = await res.json()
    return !!data.translatedText
  } catch {
    return false
  }
}

/* =========================
REHIDRATAR MEDICAMENTO (rellenar campos vacíos)
========================= */
async function rehidratarMedicamento(med) {
  // Campos _es que pueden estar vacíos
  const camposATraducir = [
    { enKey: "generic_name_en",                 esKey: "generic_name_es" },
    { enKey: "product_type_en",                 esKey: "product_type_es" },
    { enKey: "route_en",                        esKey: "route_es" },
    { enKey: "pharm_class_epc_en",              esKey: "pharm_class_epc_es" },
    { enKey: "indications_and_usage_en",        esKey: "indications_and_usage_es" },
    { enKey: "dosage_and_administration_en",    esKey: "dosage_and_administration_es" },
    { enKey: "warnings_en",                     esKey: "warnings_es" },
    { enKey: "do_not_use_en",                   esKey: "do_not_use_es" },
    { enKey: "ask_doctor_en",                   esKey: "ask_doctor_es" },
    { enKey: "stop_use_en",                     esKey: "stop_use_es" },
    { enKey: "keep_out_of_reach_of_children_en", esKey: "keep_out_of_reach_of_children_es" },
    { enKey: "pregnancy_or_breast_feeding_en",  esKey: "pregnancy_or_breast_feeding_es" },
    { enKey: "spl_unclassified_section_en",     esKey: "spl_unclassified_section_es" },
  ]

  // Detectar cuáles necesitan traducción
  const faltantes = camposATraducir.filter(({ enKey, esKey }) => {
    const enVal = med[enKey]
    const esVal = med[esKey]
    return enVal && (!esVal || esVal.trim() === enVal.trim())
  })

  if (faltantes.length === 0) {
    console.log(`✅ Medicamento "${med.generic_name_en}" ya tiene todos los campos en español`)
    return med
  }

  console.log(`🔄 Rehidratando ${faltantes.length} campos vacíos en español para "${med.generic_name_en}"`)

  // Traducir los campos faltantes
  const updates = {}
  for (const { enKey, esKey } of faltantes) {
    const traducido = await traducirCampo(med[enKey], "en", "es")
    // Solo actualizar si la traducción es diferente al inglés
    if (traducido && traducido.trim() !== med[enKey]?.trim()) {
      updates[esKey] = traducido
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log(`⚠️ Traductor no pudo traducir ningún campo nuevo`)
    return med
  }

  // Construir UPDATE dinámico
  const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(", ")
  const values = [med.id, ...Object.values(updates)]

  const { rows } = await db.query(
    `UPDATE medicamentos SET ${setClauses} WHERE id = $1 RETURNING *`,
    values
  )

  console.log(`✅ Medicamento rehidratado: ${Object.keys(updates).join(", ")}`)
  return rows[0] || med
}

/* =========================
OBTENER MEDICAMENTO (BD + API)
========================= */
async function obtenerMedicamento(medicamento, idioma) {
  const nombreOriginal = medicamento.toLowerCase().trim()
  console.log(`\n🚀 ===== INICIO BÚSQUEDA =====`)
  console.log(`📥 Entrada: "${nombreOriginal}" | Idioma: ${idioma}`)

  let med = null
  let nombreEn = nombreOriginal

  // 1. Buscar en BD con el nombre original
  console.log(`\n📂 [1] BD con nombre original: "${nombreOriginal}"`)
  med = await buscarMedicamentoBD(nombreOriginal)
  if (med) {
    console.log(`✅ [1] Encontrado en BD → id=${med.id} en="${med.generic_name_en}" es="${med.generic_name_es}"`)
  } else {
    console.log(`❌ [1] No encontrado en BD`)
  }

  // 2. Si no encontró y el idioma es español, traducir al inglés y buscar de nuevo
  if (!med && idioma === "es") {
    console.log(`\n🔤 [2] Traduciendo es→en: "${medicamento}"`)
    const traducido = await traducir(medicamento, "es", "en")
    console.log(`🔤 [2] Resultado raw: ${JSON.stringify(traducido)}`)
    console.log(`🔤 [2] Tipo: ${typeof traducido} | Longitud: ${traducido?.length}`)

    if (traducido && traducido.trim() !== nombreOriginal) {
      nombreEn = traducido.trim()
      console.log(`\n📂 [2b] BD con nombre traducido: "${nombreEn}"`)
      med = await buscarMedicamentoBD(nombreEn)
      if (med) {
        console.log(`✅ [2b] Encontrado en BD → id=${med.id} en="${med.generic_name_en}" es="${med.generic_name_es}"`)
      } else {
        console.log(`❌ [2b] No encontrado en BD con: "${nombreEn}"`)
        // Intentar búsqueda más laxa: solo las primeras palabras
        const palabras = nombreEn.split(" ")
        if (palabras.length > 1) {
          console.log(`📂 [2c] Reintentando con primera palabra: "${palabras[0]}"`)
          med = await buscarMedicamentoBD(palabras[0])
          if (med) {
            console.log(`✅ [2c] Encontrado con primera palabra: "${palabras[0]}"`)
            nombreEn = palabras[0]
          }
        }
      }
    } else {
      console.log(`⚠️ [2] Traducción nula o igual al original: "${traducido}" → se usará original`)
    }
  }

  // 3. Si encontró en BD, verificar si necesita rehidratación
  if (med) {
    if (idioma === "es") {
      const camposCheck = ["generic_name", "indications_and_usage", "dosage_and_administration", "warnings", "product_type", "route"]
      const camposFaltantes = camposCheck.filter(campo => {
        const enVal = med[`${campo}_en`]
        const esVal = med[`${campo}_es`]
        return enVal && (!esVal || esVal.trim() === enVal.trim())
      })
      console.log(`\n🔎 [3] Campos _es faltantes o duplicados: [${camposFaltantes.join(", ")}]`)

      if (camposFaltantes.length > 0) {
        console.log(`🔌 [3] Verificando traductor...`)
        const disponible = await traductorDisponible()
        console.log(`🔌 [3] Traductor disponible: ${disponible}`)
        if (disponible) {
          console.log(`🔄 [3] Rehidratando medicamento id=${med.id}...`)
          med = await rehidratarMedicamento(med)
        } else {
          console.log(`⚠️ [3] Traductor apagado, se sirve con lo disponible`)
        }
      } else {
        console.log(`✅ [3] Todos los campos _es están completos`)
      }
    }
    return med
  }

  // 4. No está en BD — buscar en OpenFDA
  console.log(`\n🌐 [4] Buscando en OpenFDA con: "${nombreEn}"`)
  let apiData = await consultarAPI(nombreEn)
  console.log(`🌐 [4] OpenFDA devolvió ${apiData.results?.length ?? 0} resultados`)

  // 5. Si falla con la traducción, reintentar con el nombre original
  if ((!apiData.results || apiData.results.length === 0) && nombreEn !== nombreOriginal) {
    console.log(`\n🔁 [5] Reintentando OpenFDA con nombre original: "${nombreOriginal}"`)
    apiData = await consultarAPI(nombreOriginal)
    console.log(`🔁 [5] OpenFDA devolvió ${apiData.results?.length ?? 0} resultados`)
  }

  if (!apiData.results || apiData.results.length === 0) {
    console.log(`❌ No encontrado en ninguna fuente para: "${medicamento}"`)
    return null
  }

  const r = apiData.results[0]
  console.log(`\n✅ OpenFDA encontró:`)
  console.log(`   generic_name: ${r.openfda?.generic_name?.[0]}`)
  console.log(`   substance_name: ${r.openfda?.substance_name?.[0]}`)
  console.log(`   brand_name: ${r.openfda?.brand_name?.[0]}`)
  console.log(`💾 Guardando en BD...`)
  return await guardarMedicamento(r)
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
  return await crearConversacion(usuarioId, medicamentoId, titulo)
}

/* =========================
CONTROLADOR PRINCIPAL
========================= */
const consultarMedicamento = async (req, res) => {
  try {
    const { medicamento, filtros } = req.body
    const usuarioId = req.usuario.id
    const idioma = req.usuario.idioma === "English" ? "en" : "es"

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