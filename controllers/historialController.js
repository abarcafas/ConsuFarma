const db = require("../db")

/* =========================
QUERIES
========================= */

const insertarConversacion = async (usuarioId, medicamentoId, titulo) => {
  const result = await db.query(
    `INSERT INTO conversaciones (usuario_id, medicamento_id, titulo)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [usuarioId, medicamentoId, titulo]
  )
  return result.rows[0]
}

const insertarMensaje = async (conversacionId, contenido, esUsuario) => {
  await db.query(
    `INSERT INTO mensajes (conversacion_id, contenido, es_usuario)
     VALUES ($1, $2, $3)`,
    [conversacionId, contenido, esUsuario]
  )
}

const getHistorialByUsuario = async (usuarioId) => {
  const result = await db.query(
    `SELECT id, titulo, fecha_inicio
     FROM conversaciones
     WHERE usuario_id = $1
     ORDER BY fecha_inicio DESC
     LIMIT 10`,
    [usuarioId]
  )
  return result.rows
}

const getMensajesByConversacion = async (conversacionId) => {
  const result = await db.query(
    `SELECT contenido, es_usuario, fecha_envio
     FROM mensajes
     WHERE conversacion_id = $1
     ORDER BY fecha_envio ASC`,
    [conversacionId]
  )
  return result.rows
}

const eliminarConversacionQuery = async (conversacionId, usuarioId) => {
  // Verificar que la conversación pertenece al usuario
  const check = await db.query(
    `SELECT id FROM conversaciones WHERE id = $1 AND usuario_id = $2`,
    [conversacionId, usuarioId]
  )
  if (!check.rows.length) return false

  // Eliminar mensajes primero (FK), luego la conversación
  await db.query(`DELETE FROM mensajes WHERE conversacion_id = $1`, [conversacionId])
  await db.query(`DELETE FROM conversaciones WHERE id = $1`, [conversacionId])
  return true
}

/* =========================
SERVICIOS
========================= */

const crearConversacion = async (usuarioId, medicamentoId, titulo) => {
  try {
    return await insertarConversacion(usuarioId, medicamentoId, titulo)
  } catch (error) {
    console.error("Error creando conversación:", error)
    throw error
  }
}

const guardarMensaje = async (conversacionId, contenido, esUsuario) => {
  try {
    await insertarMensaje(conversacionId, contenido, esUsuario)
  } catch (error) {
    console.error("Error guardando mensaje:", error)
  }
}

/* =========================
CONTROLADORES
========================= */

const obtenerHistorial = async (req, res) => {
  try {
    const usuarioId = req.usuario.id
    const historial = await getHistorialByUsuario(usuarioId)
    res.json(historial)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo historial" })
  }
}

const obtenerMensajes = async (req, res) => {
  try {
    const { id } = req.params
    const mensajes = await getMensajesByConversacion(id)
    res.json(mensajes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error obteniendo mensajes" })
  }
}

const eliminarConversacion = async (req, res) => {
  try {
    const { id } = req.params
    const usuarioId = req.usuario.id
    const eliminado = await eliminarConversacionQuery(id, usuarioId)
    if (!eliminado) return res.status(404).json({ error: "Conversación no encontrada" })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error eliminando conversación" })
  }
}

module.exports = {
  crearConversacion,
  guardarMensaje,
  obtenerHistorial,
  obtenerMensajes,
  eliminarConversacion
}
