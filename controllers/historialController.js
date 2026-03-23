const db = require("../db")

// ✅ Crear conversación (historial)
const crearConversacion = async (usuarioId, medicamentoId, titulo) => {
  try {
    const result = await db.query(
      `INSERT INTO conversaciones (usuario_id, medicamento_id, titulo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [usuarioId, medicamentoId, titulo]
    )

    return result.rows[0]

  } catch (error) {
    console.error("Error creando conversación:", error)
    throw error
  }
}

// ✅ Guardar mensaje
const guardarMensaje = async (conversacionId, contenido, esUsuario) => {
  try {
    await db.query(
      `INSERT INTO mensajes (conversacion_id, contenido, es_usuario)
       VALUES ($1, $2, $3)`,
      [conversacionId, contenido, esUsuario]
    )
  } catch (error) {
    console.error("Error guardando mensaje:", error)
  }
}

// ✅ Obtener historial (para sidebar)
const obtenerHistorial = async (req, res) => {
  try {
    const usuarioId = req.usuario.id

    const result = await db.query(
      `SELECT id, titulo, fecha_inicio
       FROM conversaciones
       WHERE usuario_id = $1
       ORDER BY fecha_inicio DESC
       LIMIT 10`,
      [usuarioId]
    )

    res.json(result.rows)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo historial" })
  }
}

// ✅ Obtener mensajes de una conversación
const obtenerMensajes = async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `SELECT contenido, es_usuario, fecha_envio
       FROM mensajes
       WHERE conversacion_id = $1
       ORDER BY fecha_envio ASC`,
      [id]
    )

    res.json(result.rows)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo mensajes" })
  }
}

module.exports = {
  crearConversacion,
  guardarMensaje,
  obtenerHistorial,
  obtenerMensajes
}