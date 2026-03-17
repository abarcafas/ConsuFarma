const axios = require("axios");


/* =====================================
   TRADUCIR TEXTO
===================================== */

async function traducir(texto, source, target) {

  if (!texto) return "";

  const response = await axios.post(
    "http://localhost:5000/translate",
    {
      q: texto,
      source,
      target,
      format: "text"
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data.translatedText;

}


/* =====================================
   CONSULTAR API FDA
===================================== */

async function consultarAPI(nombreMedicamento) {

  const response = await axios.get(
    "https://api.fda.gov/drug/label.json",
    {
      params: {
        search: `openfda.generic_name:${nombreMedicamento}`,
        limit: 1
      }
    }
  );

  return response.data;

}


/* =====================================
   OBTENER DATOS DEL MEDICAMENTO
===================================== */

function obtenerDatosMedicamento(result, medicamento) {

  return {

    nombre: result.openfda?.generic_name?.[0] || medicamento,

    general: `
Type: ${result.openfda?.product_type?.[0] || ""}
Route: ${result.openfda?.route?.[0] || ""}
Pharmacological class: ${result.openfda?.pharm_class_epc?.[0] || ""}
`,

    indicaciones: result.indications_and_usage?.[0] || "",

    dosificacion: result.dosage_and_administration?.[0] || "",

    advertencias: result.warnings?.[0] || "",

    especial: `
${result.do_not_use?.[0] || ""}
${result.ask_doctor?.[0] || ""}
${result.stop_use?.[0] || ""}
${result.keep_out_of_reach_of_children?.[0] || ""}
${result.pregnancy_or_breast_feeding?.[0] || ""}
${result.spl_unclassified_section?.[0] || ""}
`

  };

}


/* =====================================
   GENERAR HTML DE RESPUESTA
===================================== */

async function generarContenido(medicamentoData, filtros, lang) {

  const iconos = {
    general: "📋",
    indicaciones: "🩺",
    dosificacion: "💉",
    advertencias: "⚠️",
    especial: "✨"
  };

  const nombresFiltros = {

    es:{
      general:"GENERAL",
      indicaciones:"INDICACIONES",
      dosificacion:"DOSIFICACIÓN",
      advertencias:"ADVERTENCIAS",
      especial:"INFORMACIÓN ESPECIAL"
    },

    en:{
      general:"GENERAL",
      indicaciones:"INDICATIONS",
      dosificacion:"DOSAGE",
      advertencias:"WARNINGS",
      especial:"SPECIAL INFORMATION"
    }

  };

  let contenido = "";

  for (const filtro of filtros) {

    let seccion = medicamentoData[filtro];

    if (!seccion) continue;

    // traducir todo si es usuario español
    if (lang === "es") {
      seccion = await traducir(seccion, "en", "es");
    }

    seccion = seccion
      .replace(/\n+/g, "<br>")
      .replace(/\.\s/g, ".<br>")
      .trim();

    const titulo = nombresFiltros[lang][filtro];

    contenido += `
    <div style="margin-bottom:22px">

      <div style="
        font-weight:700;
        color:#135c47;
        font-size:15px;
        margin-bottom:3px;
      ">
        ${iconos[filtro]} ${titulo}
      </div>

      <div style="
        font-size:14px;
        line-height:1.5;
      ">
        ${seccion}
      </div>

    </div>
    `;

  }

  return contenido;

}


/* =====================================
   CONTROLADOR PRINCIPAL
===================================== */

const consultarMedicamento = async (req, res) => {

  try {

    const { medicamento, filtros } = req.body;
    const idioma = req.usuario.idioma;

    const lang = idioma === "English" ? "en" : "es";

    let data;

    try {

      data = await consultarAPI(medicamento);

    } catch {

      if (lang === "es") {

        const traduccion = await traducir(medicamento, "es", "en");
        data = await consultarAPI(traduccion);

      } else {

        return res.json({
          encontrado:false,
          titulo:"Error",
          contenido:"Medicine not found. Please write the generic name in English."
        });

      }

    }

    if (!data.results || data.results.length === 0) {

      return res.json({
        encontrado:false,
        titulo:"Error",
        contenido: lang === "es"
          ? "Medicamento no encontrado"
          : "Medicine not found"
      });

    }

    const result = data.results[0];

    const medicamentoData = obtenerDatosMedicamento(result, medicamento);

    const contenido = await generarContenido(medicamentoData, filtros, lang);

    res.json({
      encontrado:true,
      titulo:`Medicamento: ${medicamentoData.nombre}`,
      contenido
    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({
      encontrado:false,
      respuesta:"Error consultando medicamento"
    });

  }

};


module.exports = { consultarMedicamento };