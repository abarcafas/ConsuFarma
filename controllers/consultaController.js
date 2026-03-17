const axios = require("axios")
const db = require("../db")

/* =========================
TRADUCTOR
========================= */

async function traducir(texto, from = "en", to = "es") {
  try {
    const res = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
OBTENER NOMBRE EN INGLÉS
========================= */

async function obtenerNombreEnIngles(nombre, lang){

  if(lang === "es"){
    const traducido = await traducir(nombre,"es","en")
    return traducido || nombre.toLowerCase()
  }

  return nombre.toLowerCase()
}

/* =========================
CONSULTAR API OPENFDA
========================= */

async function consultarAPI(nombre){
  const response = await axios.get(
    "https://api.fda.gov/drug/label.json",
    {
      params:{
        search:`openfda.generic_name:${nombre}`,
        limit:1
      }
    }
  )
  return response.data
}

/* =========================
BUSCAR MEDICAMENTO EN BD
========================= */

async function buscarMedicamentoBD(nombre){

  const query = `
  SELECT *
  FROM medicamentos
  WHERE LOWER(generic_name_en) = LOWER($1)
  LIMIT 1
  `

  const result = await db.query(query,[nombre])

  return result.rows[0] || null
}

/* =========================
GUARDAR MEDICAMENTO (SOLO EN INGLÉS)
========================= */

async function guardarMedicamento(result){

  const generic_en = (result.openfda?.generic_name?.[0] || "").toLowerCase()

  /* ===== TRADUCCIONES ===== */

  const product_type_en = result.openfda?.product_type?.[0] || ""
  const product_type_es = await traducir(product_type_en,"en","es")

  const route_en = result.openfda?.route?.[0] || ""
  const route_es = await traducir(route_en,"en","es")

  const pharm_en = result.openfda?.pharm_class_epc?.[0] || ""
  const pharm_es = await traducir(pharm_en,"en","es")

  const indications_en = result.indications_and_usage?.[0] || ""
  const indications_es = await traducir(indications_en,"en","es")

  const dosage_en = result.dosage_and_administration?.[0] || ""
  const dosage_es = await traducir(dosage_en,"en","es")

  const warnings_en = result.warnings?.[0] || ""
  const warnings_es = await traducir(warnings_en,"en","es")

  const do_not_use_en = result.do_not_use?.[0] || ""
  const do_not_use_es = await traducir(do_not_use_en,"en","es")

  const ask_doctor_en = result.ask_doctor?.[0] || ""
  const ask_doctor_es = await traducir(ask_doctor_en,"en","es")

  const stop_use_en = result.stop_use?.[0] || ""
  const stop_use_es = await traducir(stop_use_en,"en","es")

  const keep_en = result.keep_out_of_reach_of_children?.[0] || ""
  const keep_es = await traducir(keep_en,"en","es")

  const preg_en = result.pregnancy_or_breast_feeding?.[0] || ""
  const preg_es = await traducir(preg_en,"en","es")

  const spl_en = result.spl_unclassified_section?.[0] || ""
  const spl_es = await traducir(spl_en,"en","es")

  /* ===== INSERT ===== */

  const query = `
  INSERT INTO medicamentos(

    generic_name_en,

    product_type_en,
    product_type_es,

    route_en,
    route_es,

    pharm_class_epc_en,
    pharm_class_epc_es,

    indications_and_usage_en,
    indications_and_usage_es,

    dosage_and_administration_en,
    dosage_and_administration_es,

    warnings_en,
    warnings_es,

    do_not_use_en,
    do_not_use_es,

    ask_doctor_en,
    ask_doctor_es,

    stop_use_en,
    stop_use_es,

    keep_out_of_reach_of_children_en,
    keep_out_of_reach_of_children_es,

    pregnancy_or_breast_feeding_en,
    pregnancy_or_breast_feeding_es,

    spl_unclassified_section_en,
    spl_unclassified_section_es

  )

  VALUES(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
    $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
    $21,$22,$23,$24,$25
  )

  RETURNING *
  `

  const values=[

    generic_en,

    product_type_en,
    product_type_es,

    route_en,
    route_es,

    pharm_en,
    pharm_es,

    indications_en,
    indications_es,

    dosage_en,
    dosage_es,

    warnings_en,
    warnings_es,

    do_not_use_en,
    do_not_use_es,

    ask_doctor_en,
    ask_doctor_es,

    stop_use_en,
    stop_use_es,

    keep_en,
    keep_es,

    preg_en,
    preg_es,

    spl_en,
    spl_es
  ]

  const { rows } = await db.query(query,values)

  return rows[0]
}
/* =========================
TRADUCIR PARA MOSTRAR
========================= */

async function traducirCampos(med, lang){

  if(lang === "en"){
    return {
      nombre: med.generic_name_en,

      general: `
Type: ${med.product_type_en || ""}
Route: ${med.route_en || ""}
Pharmacological class: ${med.pharm_class_epc_en || ""}
`,

      indicaciones: med.indications_and_usage_en || "",

      dosificacion: med.dosage_and_administration_en || "",

      advertencias: med.warnings_en || "",

      especial: `
${med.do_not_use_en || ""}
${med.ask_doctor_en || ""}
${med.stop_use_en || ""}
${med.keep_out_of_reach_of_children_en || ""}
${med.pregnancy_or_breast_feeding_en || ""}
${med.spl_unclassified_section_en || ""}
`
    }
  }

  // 🔥 ESPAÑOL
  return {
    nombre: await traducir(med.generic_name_en,"en","es"),

    general: `
Tipo: ${med.product_type_es || ""}
Vía: ${med.route_es || ""}
Clase farmacológica: ${med.pharm_class_epc_es || ""}
`,

    indicaciones: med.indications_and_usage_es || "",

    dosificacion: med.dosage_and_administration_es || "",

    advertencias: med.warnings_es || "",

    especial: `
${med.do_not_use_es || ""}
${med.ask_doctor_es || ""}
${med.stop_use_es || ""}
${med.keep_out_of_reach_of_children_es || ""}
${med.pregnancy_or_breast_feeding_es || ""}
${med.spl_unclassified_section_es || ""}
`
  }
}

/* =========================
GENERAR HTML
========================= */

function generarContenido(data,filtros){

  let contenido=""

  for(const filtro of filtros){

    let seccion=data[filtro]

    if(!seccion) continue

    seccion = seccion
    .replace(/\n+/g,"<br>")
    .replace(/\.\s/g,".<br>")
    .trim()

    contenido+=`
    <div style="margin-bottom:20px">

    <div style="font-weight:700;color:#135c47;margin-bottom:4px">
    ${filtro.toUpperCase()}
    </div>

    <div style="font-size:14px;line-height:1.5">
    ${seccion}
    </div>

    </div>
    `
  }

  return contenido
}

/* =========================
CONTROLADOR PRINCIPAL
========================= */

const consultarMedicamento = async(req,res)=>{

  try{

    const {medicamento,filtros} = req.body

    const idioma = req.usuario.idioma
    const lang = idioma==="English" ? "en" : "es"

    const nombre_en = await obtenerNombreEnIngles(medicamento, lang)

    let med = await buscarMedicamentoBD(nombre_en)

    if(!med){

      let data

      try{
        data = await consultarAPI(nombre_en)
      }catch{
        return res.json({ encontrado:false })
      }

      if(!data.results || data.results.length===0){
        return res.json({ encontrado:false })
      }

      med = await guardarMedicamento(data.results[0])
    }

    const medicamentoData = await traducirCampos(med,lang)
    const contenido = generarContenido(medicamentoData,filtros)

    res.json({
      encontrado:true,
      contenido
    })

  }catch(error){

    console.log(error)

    res.status(500).json({
      encontrado:false
    })

  }
}

module.exports = { consultarMedicamento }