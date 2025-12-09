require('dotenv').config();
const nodemailer = require('nodemailer');

// Verificar variables de entorno
console.log('=== CONFIGURACIÓN SMTP ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com (default)');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
console.log('SMTP_USER:', process.env.SMTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO');
console.log('SMTP_FROM:', process.env.SMTP_FROM || process.env.SMTP_USER || 'NO CONFIGURADO');

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('\n❌ ERROR: Faltan credenciales SMTP');
  console.log('Debes configurar las variables de entorno SMTP_USER y SMTP_PASS');
  process.exit(1);
}

// Crear transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar conexión
console.log('\n=== VERIFICANDO CONEXIÓN ===');
transporter.verify()
  .then(() => {
    console.log('✅ Conexión SMTP exitosa');
    console.log('\nLa configuración de email está correcta.');
  })
  .catch((err) => {
    console.log('❌ Error de conexión SMTP:', err.message);
    console.log('\nVerifica las credenciales y la configuración del servidor SMTP.');
  })
  .finally(() => process.exit(0));
