# page_nimboerp

Landing page de **Nimbo ERP** con backend de reservas. Cuando alguien llena el formulario "Reserva tu lugar", la solicitud se guarda en SQLite y se envía un correo al dueño del negocio.

## Stack

- **Frontend**: HTML + Tailwind CSS (estático, en `public/`)
- **Backend**: Node.js + Express
- **Base de datos**: SQLite (`data/reservas.db`)
- **Email**: EmailJS (gratis, sin SMTP)

## Instalación local

```bash
npm install
cp .env.example .env   # completa las claves de EmailJS
npm start
```

Abre `http://localhost:3000`.

## Configurar EmailJS (para que te lleguen los correos)

1. Crea cuenta gratis en https://dashboard.emailjs.com
2. **Email Services** → **Add New Service** → **Gmail** → conecta tu correo
3. **Email Templates** → **New Template**:
   - Asunto: `{{subject}}`
   - HTML: `Nombre: {{from_name}}<br>Correo: {{from_email}}<br>Empresa: {{business_name}}<br>Sector: {{sector}}<br>Teléfono: {{telefono}}<br>Empleados: {{empleados}}`
   - Destinatario (To Email): `{{to_email}}`
4. **Account** → **API Keys**: copia Public Key y Private Key
5. Pega las 4 claves en tu `.env` (o en las variables de entorno de Render)

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/reserva` | Guarda una reserva y envía el correo |
| GET | `/api/reservas` | Lista todas las reservas (JSON) |
| GET | `/healthz` | Healthcheck |

### Ejemplo POST `/api/reserva`

```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "empresa": "Mi MIPYME S.A.",
  "sector": "comercio",
  "telefono": "+53 5XXX XXXX",
  "empleados": "6-20"
}
```

## Deploy gratis en Render

1. Sube este repo a GitHub
2. En https://render.com → **New** → **Blueprint** → conecta el repo
3. Render usa `render.yaml` automáticamente y pide las claves de EmailJS
4. Listo: obtienes una URL tipo `https://page-nimboerp.onrender.com`

## Ver las reservas guardadas

Abre en el navegador: `https://TU-URL/api/reservas`
