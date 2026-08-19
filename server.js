import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'nimboerp@gmail.com';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'reservas.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    empresa TEXT NOT NULL,
    sector TEXT NOT NULL,
    telefono TEXT,
    empleados TEXT,
    creada_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const reservaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/reservas', (req, res) => {
  const reservas = db.prepare('SELECT * FROM reservas ORDER BY creada_en DESC').all();
  res.json({ ok: true, reservas });
});

app.post('/api/reserva', reservaLimiter, async (req, res) => {
  const { nombre, email, empresa, sector, telefono = '', empleados = '' } = req.body || {};

  if (!nombre || !email || !empresa || !sector) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Correo electrónico inválido.' });
  }

  const stmt = db.prepare(
    'INSERT INTO reservas (nombre, email, empresa, sector, telefono, empleados) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(nombre, email, empresa, sector, telefono, empleados);

  const emailSent = await sendEmailJS({
    to_email: NOTIFY_EMAIL,
    from_name: nombre,
    from_email: email,
    business_name: empresa,
    sector,
    telefono,
    empleados,
    subject: `Nueva reserva Nimbo ERP — ${empresa}`
  });

  res.status(201).json({ ok: true, id: info.lastInsertRowid, emailSent });
});

async function sendEmailJS(params) {
  const {
    EMAILJS_SERVICE_ID: service_id,
    EMAILJS_TEMPLATE_ID: template_id,
    EMAILJS_PUBLIC_KEY: user_id,
    EMAILJS_PRIVATE_KEY: accessToken
  } = process.env;

  if (!service_id || !template_id || !user_id) {
    console.log('[emailjs] No configurado, reserva guardada sin correo.');
    return false;
  }

  const body = {
    service_id,
    template_id,
    user_id,
    accessToken,
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

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Nimbo ERP landing listening on http://localhost:${PORT}`);
});