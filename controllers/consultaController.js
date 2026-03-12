const axios = require("axios");

async function traducir(texto, source, target) {
  const response = await axios({
    method: "POST",
    url: "http://localhost:5000/translate",
    headers: { "Content-Type": "application/json" },
    data: {
      q: texto,
      source: source,
      target: target,
      format: "text"
    }
  });

  return response.data.translatedText;
}

async function buscarOpenFDA(nombre) {
  const response = await axios.get(
    "https://api.fda.gov/drug/label.json",
    {
      params: {
        search: `openfda.generic_name:${nombre}`,
        limit: 1
      }
    }
  );

  return response.data;
}

const consultarMedicamento = async (req, res) => {

  try {

    let { medicamento } = req.body;
    const idioma = req.usuario.idioma;

    console.log("Idioma usuario:", idioma);
    console.log("Medicamento ingresado:", medicamento);

    let data;

    try {

      // 1️⃣ intentar con lo que escribió el usuario
      data = await buscarOpenFDA(medicamento);

    } catch (error) {

      // 2️⃣ si falla → traducir a inglés e intentar otra vez
      if (error.response && error.response.status === 404) {

        const traduccion = await traducir(medicamento, "es", "en");

        console.log("Intentando con traducción:", traduccion);

        data = await buscarOpenFDA(traduccion);

      } else {
        throw error;
      }

    }

    if (!data || !data.results || data.results.length === 0) {
      return res.json({
        respuesta: "No se encontró información del medicamento."
      });
    }

    let descripcion =
      data.results[0].indications_and_usage?.[0] ||
      "Information not available.";

    // traducir respuesta si el usuario es español
    if (idioma === "Español") {
      descripcion = await traducir(descripcion, "en", "es");
    }

    res.json({ respuesta: descripcion });

  } catch (error) {

    console.error("Error en consulta:", error.message);

    res.status(500).json({
      respuesta: "Error al consultar medicamento."
    });

  }

};

module.exports = { consultarMedicamento };