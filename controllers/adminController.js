const db = require("../db")

/* =========================
  HELPERS
========================= */
function construirFiltrosUsuario({ genero, pais, idioma, edad_min, edad_max }) {
  const conditions = []
  const params = []
  let idx = 1

  if (genero)   { conditions.push(`u.genero = $${idx++}`);  params.push(genero) }
  if (pais)     { conditions.push(`u.pais = $${idx++}`);    params.push(pais) }
  if (idioma)   { conditions.push(`u.idioma = $${idx++}`);  params.push(idioma) }
  if (edad_min) { conditions.push(`u.edad >= $${idx++}`);   params.push(parseInt(edad_min)) }
  if (edad_max) { conditions.push(`u.edad <= $${idx++}`);   params.push(parseInt(edad_max)) }

  const where = conditions.length ? conditions.map(c => `AND ${c}`).join(" ") : ""
  return { where, params }
}

// hasta incluye todo el día (23:59:59) para que un día específico funcione
function construirFiltroFechas(params, desde, hasta) {
  let where = ""
  if (desde) {
    where += ` AND c.fecha_inicio >= $${params.length + 1}::date`
    params.push(desde)
  }
  if (hasta) {
    where += ` AND c.fecha_inicio < ($${params.length + 1}::date + interval '1 day')`
    params.push(hasta)
  }
  return where
}

/* =========================
  KPIs GENERALES
========================= */
const obtenerKPIs = async (req, res) => {
  try {
    const { desde, hasta, genero, pais, idioma, edad_min, edad_max } = req.query
    const f = construirFiltrosUsuario({ genero, pais, idioma, edad_min, edad_max })

    const p1 = [...f.params]; const fw1 = construirFiltroFechas(p1, desde, hasta)
    const p2 = [...f.params]; const fw2 = construirFiltroFechas(p2, desde, hasta)
    const p3 = [...f.params]; const fw3 = construirFiltroFechas(p3, desde, hasta)
    const p4 = [...f.params]; const fw4 = construirFiltroFechas(p4, desde, hasta)

    const [totalBusquedas, medicamentosUnicos, usuariosActivos, medicamentoEstrella] = await Promise.all([
      db.query(`SELECT COUNT(c.id) AS total FROM conversaciones c JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1 ${f.where} ${fw1}`, p1),
      db.query(`SELECT COUNT(DISTINCT c.medicamento_id) AS total FROM conversaciones c JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1 ${f.where} ${fw2}`, p2),
      db.query(`SELECT COUNT(DISTINCT c.usuario_id) AS total FROM conversaciones c JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1 ${f.where} ${fw3}`, p3),
      db.query(`SELECT COALESCE(m.generic_name_es, m.generic_name_en) AS nombre, COUNT(c.id) AS total FROM conversaciones c JOIN medicamentos m ON c.medicamento_id = m.id JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1 ${f.where} ${fw4} GROUP BY m.id ORDER BY total DESC LIMIT 1`, p4)
    ])

    // Crecimiento mes actual vs anterior (siempre sin filtro de fecha)
    const [mesActual, mesAnterior] = await Promise.all([
      db.query(`SELECT COUNT(c.id) AS total FROM conversaciones c JOIN usuarios u ON c.usuario_id = u.id WHERE c.fecha_inicio >= date_trunc('month', CURRENT_DATE) ${f.where}`, f.params),
      db.query(`SELECT COUNT(c.id) AS total FROM conversaciones c JOIN usuarios u ON c.usuario_id = u.id WHERE c.fecha_inicio >= date_trunc('month', CURRENT_DATE - interval '1 month') AND c.fecha_inicio < date_trunc('month', CURRENT_DATE) ${f.where}`, f.params)
    ])

    const totalActual  = parseInt(mesActual.rows[0]?.total || 0)
    const totalAnterior = parseInt(mesAnterior.rows[0]?.total || 0)
    const crecimiento = totalAnterior > 0 ? Math.round(((totalActual - totalAnterior) / totalAnterior) * 100) : 0

    res.json({
      totalBusquedas:    parseInt(totalBusquedas.rows[0]?.total || 0),
      medicamentosUnicos: parseInt(medicamentosUnicos.rows[0]?.total || 0),
      usuariosActivos:   parseInt(usuariosActivos.rows[0]?.total || 0),
      crecimientoMensual: crecimiento,
      medicamentoEstrella: medicamentoEstrella.rows[0] || null
    })
  } catch (error) {
    console.error("Error en obtenerKPIs:", error)
    res.status(500).json({ error: "Error obteniendo KPIs" })
  }
}

/* =========================
  TOP MEDICAMENTOS
========================= */
const obtenerTopMedicamentos = async (req, res) => {
  try {
    const { desde, hasta, genero, pais, idioma, edad_min, edad_max, limit = 10 } = req.query
    const f = construirFiltrosUsuario({ genero, pais, idioma, edad_min, edad_max })
    const params = [...f.params]
    const fw = construirFiltroFechas(params, desde, hasta)
    params.push(parseInt(limit))

    const result = await db.query(`
      SELECT
        COALESCE(m.generic_name_es, m.generic_name_en) AS nombre,
        m.generic_name_en AS nombre_en,
        m.product_type_es AS tipo,
        COUNT(c.id) AS total,
        ROUND(COUNT(c.id) * 100.0 / SUM(COUNT(c.id)) OVER (), 1) AS porcentaje
      FROM conversaciones c
      JOIN medicamentos m ON c.medicamento_id = m.id
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1 ${f.where} ${fw}
      GROUP BY m.id
      ORDER BY total DESC
      LIMIT $${params.length}
    `, params)

    res.json(result.rows)
  } catch (error) {
    console.error("Error en obtenerTopMedicamentos:", error)
    res.status(500).json({ error: "Error obteniendo top medicamentos" })
  }
}

/* =========================
  POR GÉNERO
========================= */
const obtenerPorGenero = async (req, res) => {
  try {
    const { desde, hasta, pais, idioma, edad_min, edad_max } = req.query
    const f = construirFiltrosUsuario({ pais, idioma, edad_min, edad_max })
    const params = [...f.params]
    const fw = construirFiltroFechas(params, desde, hasta)

    const result = await db.query(`
      SELECT u.genero, COUNT(c.id) AS total,
        ROUND(COUNT(c.id) * 100.0 / SUM(COUNT(c.id)) OVER (), 1) AS porcentaje
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1 ${f.where} ${fw}
      GROUP BY u.genero
      ORDER BY total DESC
    `, params)

    res.json(result.rows)
  } catch (error) {
    console.error("Error en obtenerPorGenero:", error)
    res.status(500).json({ error: "Error obteniendo datos por género" })
  }
}

/* =========================
  POR PAÍS
========================= */
const obtenerPorPais = async (req, res) => {
  try {
    const { desde, hasta, genero, idioma, edad_min, edad_max } = req.query
    const f = construirFiltrosUsuario({ genero, idioma, edad_min, edad_max })
    const params = [...f.params]
    const fw = construirFiltroFechas(params, desde, hasta)

    const result = await db.query(`
      SELECT COALESCE(u.pais, 'Desconocido') AS pais,
        COUNT(c.id) AS total,
        ROUND(COUNT(c.id) * 100.0 / SUM(COUNT(c.id)) OVER (), 1) AS porcentaje
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1 ${f.where} ${fw}
      GROUP BY u.pais
      ORDER BY total DESC
      LIMIT 10
    `, params)

    res.json(result.rows)
  } catch (error) {
    console.error("Error en obtenerPorPais:", error)
    res.status(500).json({ error: "Error obteniendo datos por país" })
  }
}

/* =========================
  POR EDAD
========================= */
const obtenerPorEdad = async (req, res) => {
  try {
    const { desde, hasta, genero, pais, idioma } = req.query
    const f = construirFiltrosUsuario({ genero, pais, idioma })
    const params = [...f.params]
    const fw = construirFiltroFechas(params, desde, hasta)

    const result = await db.query(`
      SELECT
        CASE
          WHEN u.edad BETWEEN 18 AND 25 THEN '18-25'
          WHEN u.edad BETWEEN 26 AND 35 THEN '26-35'
          WHEN u.edad BETWEEN 36 AND 50 THEN '36-50'
          WHEN u.edad > 50 THEN '50+'
          ELSE 'Otro'
        END AS rango_edad,
        COUNT(c.id) AS total,
        ROUND(COUNT(c.id) * 100.0 / SUM(COUNT(c.id)) OVER (), 1) AS porcentaje
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1 ${f.where} ${fw}
      GROUP BY rango_edad
      ORDER BY MIN(u.edad)
    `, params)

    res.json(result.rows)
  } catch (error) {
    console.error("Error en obtenerPorEdad:", error)
    res.status(500).json({ error: "Error obteniendo datos por edad" })
  }
}

/* =========================
  TENDENCIA TEMPORAL
========================= */
const obtenerTendencia = async (req, res) => {
  try {
    const { medicamento_id, genero, pais, idioma, edad_min, edad_max, meses = 10 } = req.query
    const f = construirFiltrosUsuario({ genero, pais, idioma, edad_min, edad_max })
    const params = [...f.params]
    params.push(parseInt(meses))
    const mesesIdx = params.length
    if (medicamento_id) params.push(medicamento_id)

    const result = await db.query(`
      SELECT
        TRIM(TO_CHAR(DATE_TRUNC('month', c.fecha_inicio), 'Mon YYYY')) AS mes,
        DATE_TRUNC('month', c.fecha_inicio) AS mes_fecha,
        COUNT(c.id) AS total
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.fecha_inicio >= NOW() - ($${mesesIdx} || ' months')::interval
        ${f.where}
        ${medicamento_id ? `AND c.medicamento_id = $${params.length}` : ""}
      GROUP BY DATE_TRUNC('month', c.fecha_inicio)
      ORDER BY mes_fecha ASC
    `, params)

    res.json(result.rows)
  } catch (error) {
    console.error("Error en obtenerTendencia:", error)
    res.status(500).json({ error: "Error obteniendo tendencia temporal" })
  }
}

/* =========================
  CRUCE GÉNERO x MEDICAMENTO
========================= */
const obtenerCruceGeneroMedicamento = async (req, res) => {
  try {
    const { desde, hasta, pais, idioma, edad_min, edad_max, limit = 5 } = req.query
    const f = construirFiltrosUsuario({ pais, idioma, edad_min, edad_max })

    // Params para el subquery de top medicamentos (con filtros)
    const paramsTop = [...f.params]
    const fwTop = construirFiltroFechas(paramsTop, desde, hasta)
    paramsTop.push(parseInt(limit))

    // Params para el query principal
    const params = [...f.params]
    const fw = construirFiltroFechas(params, desde, hasta)
    params.push(parseInt(limit))

    const result = await db.query(`
      SELECT
        COALESCE(m.generic_name_es, m.generic_name_en) AS nombre,
        u.genero,
        COUNT(c.id) AS total
      FROM conversaciones c
      JOIN medicamentos m ON c.medicamento_id = m.id
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1 ${f.where} ${fw}
        AND m.id IN (
          SELECT c2.medicamento_id
          FROM conversaciones c2
          JOIN usuarios u2 ON c2.usuario_id = u2.id
          WHERE 1=1 ${f.where.replace(/\bu\./g, 'u2.')} ${fwTop.replace(/\bc\./g, 'c2.')}
          GROUP BY c2.medicamento_id
          ORDER BY COUNT(*) DESC
          LIMIT $${params.length}
        )
      GROUP BY m.id, u.genero
      ORDER BY SUM(COUNT(c.id)) OVER (PARTITION BY m.id) DESC, m.id, total DESC
    `, params)

    const pivot = {}
    result.rows.forEach(row => {
      if (!pivot[row.nombre]) pivot[row.nombre] = { nombre: row.nombre, total: 0 }
      pivot[row.nombre][row.genero] = parseInt(row.total)
      pivot[row.nombre].total += parseInt(row.total)
    })

    const datos = Object.values(pivot).map(med => {
      const masc = med['Masculino'] || 0
      const fem  = med['Femenino']  || 0
      const tot  = med.total || 1
      return {
        nombre:        med.nombre,
        total:         med.total,
        pct_femenino:  Math.round((fem / tot) * 100),
        pct_masculino: Math.round((masc / tot) * 100),
        pct_otro:      Math.round(((tot - masc - fem) / tot) * 100)
      }
    })

    res.json(datos)
  } catch (error) {
    console.error("Error en obtenerCruceGeneroMedicamento:", error)
    res.status(500).json({ error: "Error obteniendo cruce género/medicamento" })
  }
}

/* =========================
  ANÁLISIS MEDICAMENTO ESPECÍFICO
========================= */
const obtenerAnalisisMedicamento = async (req, res) => {
  try {
    const { id } = req.params
    const { desde, hasta } = req.query

    const med = await db.query(
      `SELECT generic_name_es, generic_name_en FROM medicamentos WHERE id = $1`, [id]
    )
    if (!med.rows.length) return res.status(404).json({ error: "Medicamento no encontrado" })

    // Params base reutilizables — cada query construye su propio array
    const makeParams = () => {
      const p = [id]
      const w = construirFiltroFechas(p, desde, hasta)
      return { p, w }
    }

    const t1 = makeParams()
    const total = await db.query(`
      SELECT COUNT(*) AS total FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.medicamento_id = $1 ${t1.w}
    `, t1.p)

    const totalNum = parseInt(total.rows[0]?.total || 1)

    const t2 = makeParams()
    const perfil = await db.query(`
      SELECT u.genero, u.pais,
        CASE
          WHEN u.edad BETWEEN 18 AND 25 THEN '18-25'
          WHEN u.edad BETWEEN 26 AND 35 THEN '26-35'
          WHEN u.edad BETWEEN 36 AND 50 THEN '36-50'
          ELSE '50+'
        END AS rango_edad,
        COUNT(*) AS total
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.medicamento_id = $1 ${t2.w}
      GROUP BY u.genero, u.pais, rango_edad
      ORDER BY total DESC LIMIT 1
    `, t2.p)

    const t3 = makeParams()
    const mesPico = await db.query(`
      SELECT TRIM(TO_CHAR(DATE_TRUNC('month', c.fecha_inicio), 'Month YYYY')) AS mes,
        COUNT(*) AS total
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.medicamento_id = $1 ${t3.w}
      GROUP BY DATE_TRUNC('month', c.fecha_inicio)
      ORDER BY total DESC LIMIT 1
    `, t3.p)

    const t4 = makeParams()
    const idioma = await db.query(`
      SELECT u.idioma, COUNT(*) AS total
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.medicamento_id = $1 ${t4.w}
      GROUP BY u.idioma ORDER BY total DESC LIMIT 1
    `, t4.p)

    const t5 = makeParams()
    const paisLider = await db.query(`
      SELECT u.pais, COUNT(*) AS total,
        ROUND(COUNT(*) * 100.0 / ${totalNum}, 1) AS porcentaje
      FROM conversaciones c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.medicamento_id = $1 ${t5.w}
      GROUP BY u.pais ORDER BY total DESC LIMIT 1
    `, t5.p)

    const tendencia = await db.query(`
      SELECT TRIM(TO_CHAR(DATE_TRUNC('month', c.fecha_inicio), 'Mon')) AS mes,
        DATE_TRUNC('month', c.fecha_inicio) AS mes_fecha,
        COUNT(*) AS total
      FROM conversaciones c
      WHERE c.medicamento_id = $1
        AND c.fecha_inicio >= NOW() - interval '6 months'
      GROUP BY DATE_TRUNC('month', c.fecha_inicio)
      ORDER BY mes_fecha ASC
    `, [id])

    res.json({
      nombre: med.rows[0].generic_name_es || med.rows[0].generic_name_en,
      total:  parseInt(total.rows[0]?.total || 0),
      perfilPrincipal:  perfil.rows[0]    || null,
      mesPico:          mesPico.rows[0]   || null,
      idiomaDominante:  idioma.rows[0]?.idioma || null,
      paisLider:        paisLider.rows[0] || null,
      tendencia:        tendencia.rows
    })
  } catch (error) {
    console.error("Error en obtenerAnalisisMedicamento:", error)
    res.status(500).json({ error: "Error obteniendo análisis de medicamento" })
  }
}

/* =========================
  AUTOCOMPLETE MEDICAMENTOS
========================= */
const buscarMedicamentos = async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    const result = await db.query(`
      SELECT id,
        COALESCE(generic_name_es, generic_name_en) AS nombre,
        generic_name_en AS nombre_en
      FROM medicamentos
      WHERE LOWER(generic_name_es) ILIKE $1
         OR LOWER(generic_name_en) ILIKE $1
      ORDER BY nombre LIMIT 10
    `, [`%${q.toLowerCase()}%`])

    res.json(result.rows)
  } catch (error) {
    console.error("Error en buscarMedicamentos:", error)
    res.status(500).json({ error: "Error buscando medicamentos" })
  }
}

module.exports = {
  obtenerKPIs,
  obtenerTopMedicamentos,
  obtenerPorGenero,
  obtenerPorPais,
  obtenerPorEdad,
  obtenerTendencia,
  obtenerCruceGeneroMedicamento,
  obtenerAnalisisMedicamento,
  buscarMedicamentos
}
