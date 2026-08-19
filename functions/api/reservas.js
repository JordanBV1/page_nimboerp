export async function onRequestGet(context) {
  const { env } = context;

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    await env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS reservas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, email TEXT NOT NULL, empresa TEXT NOT NULL, sector TEXT NOT NULL, telefono TEXT, empleados TEXT, creada_en TEXT NOT NULL DEFAULT (datetime(\'now\', \'utc\')))'
    ).run();

    const { results } = await env.DB.prepare(
      'SELECT * FROM reservas ORDER BY creada_en DESC'
    ).all();

    return json({ ok: true, reservas: results }, 200, CORS_HEADERS);
  } catch (err) {
    console.error('Error DB:', err);
    return json({ ok: false, error: 'Error interno del servidor.' }, 500, CORS_HEADERS);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
