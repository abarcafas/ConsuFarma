const axios = require('axios');

const consultarMedicamento = async (req, res) => {
  try {
    const { medicamento } = req.body;

    console.log("🔎 Buscando en OpenFDA:", medicamento);

    const response = await axios.get(
      `https://api.fda.gov/drug/label.json`,
      {
        params: {
          search: `openfda.generic_name:${medicamento}`,
          limit: 1
        }
      }
    );

    const data = response.data;

    if (!data.results || data.results.length === 0) {
      return res.json({
        respuesta: "No se encontró información del medicamento."
      });
    }

    const info = data.results[0];

    const descripcion =
      info.description?.[0] ||
      info.indications_and_usage?.[0] ||
      "Información encontrada, pero sin descripción disponible.";

    res.json({
      respuesta: descripcion
    });

  } catch (error) {
    console.error("Error en consulta:", error.message);

    res.status(500).json({
      respuesta: "Error al consultar OpenFDA."
    });
  }
};

module.exports = { consultarMedicamento };