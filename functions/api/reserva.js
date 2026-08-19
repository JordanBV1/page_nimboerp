export async function onRequestPost(context) {
  const { request, env } = context;

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido.' }, 400, CORS_HEADERS);
  }

  const { nombre, email, empresa, sector, telefono = '', empleados = '' } = body || {};

  if (!nombre || !email || !empresa || !sector) {
    return json({ ok: false, error: 'Faltan campos obligatorios.' }, 400, CORS_HEADERS);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json({ ok: false, error: 'Correo electrónico inválido.' }, 400, CORS_HEADERS);
  }

  try {
    await env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS reservas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, email TEXT NOT NULL, empresa TEXT NOT NULL, sector TEXT NOT NULL, telefono TEXT, empleados TEXT, creada_en TEXT NOT NULL DEFAULT (datetime(\'now\', \'utc\')))'
    ).run();

    const result = await env.DB.prepare(
      'INSERT INTO reservas (nombre, email, empresa, sector, telefono, empleados) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(nombre, email, empresa, sector, telefono, empleados)
      .run();

    const emailSent = await sendEmailJS(env, {
      to_email: env.NOTIFY_EMAIL || 'nimboerp@gmail.com',
      from_name: nombre,
      from_email: email,
      business_name: empresa,
      sector,
      telefono,
      empleados,
      subject: `Nueva reserva Nimbo ERP — ${empresa}`
    });

    return json({ ok: true, id: result.meta.last_row_id, emailSent }, 201, CORS_HEADERS);
  } catch (err) {
    console.error('Error DB:', err);
    return json({ ok: false, error: 'Error interno del servidor.' }, 500, CORS_HEADERS);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

async function sendEmailJS(env, params) {
  const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = env;

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.log('[emailjs] No configurado, reserva guardada sin correo.');
    return false;
  }

  const body = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    accessToken: EMAILJS_PRIVATE_KEY,
    template_params: params
  };

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[emailjs] Error:', res.status, text);
      return false;
    }
    console.log('[emailjs] Correo enviado a', params.to_email);
    return true;
  } catch (err) {
    console.error('[emailjs] Excepción:', err.message);
    return false;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
