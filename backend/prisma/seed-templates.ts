import { PrismaClient, NotificationEventType } from '@prisma/client';

const prisma = new PrismaClient();

// Base template con estilos
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; padding: 30px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px; }
    .card { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1; }
    .button { display: inline-block; background: #6366f1; color: #fff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #5855eb; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; font-size: 12px; color: #666; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 16px; font-weight: 600; color: #333; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-success { background: #dcfce7; color: #166534; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-danger { background: #fee2e2; color: #991b1b; }
    .status-info { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Este es un mensaje automático de Hub. Por favor no responda a este email.</p>
      <p>&copy; ${new Date().getFullYear()} Hub - Portal de Proveedores</p>
    </div>
  </div>
</body>
</html>
`;

// Templates por evento
const templates: Array<{
  eventType: NotificationEventType;
  subject: string;
  bodyHtml: string;
}> = [
  // ============================================
  // REQUERIMIENTOS
  // ============================================
  {
    eventType: 'REQ_SUBMITTED',
    subject: 'Nuevo requerimiento enviado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Nuevo Requerimiento</h1>
      </div>
      <div class="content">
        <p>Se ha enviado un nuevo requerimiento para aprobación.</p>
        <div class="card">
          <p class="label">Número</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Título</p>
          <p class="value">{{titulo}}</p>
          <p class="label" style="margin-top: 15px;">Solicitante</p>
          <p class="value">{{solicitante}}</p>
          <p class="label" style="margin-top: 15px;">Monto Estimado</p>
          <p class="value">{{montoEstimado}}</p>
          <p class="label" style="margin-top: 15px;">Prioridad</p>
          <p class="value">{{prioridad}}</p>
        </div>
        <a href="{{actionUrl}}" class="button">Ver Requerimiento</a>
      </div>
    `),
  },
  {
    eventType: 'REQ_APPROVED',
    subject: 'Requerimiento aprobado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Requerimiento Aprobado</h1>
      </div>
      <div class="content">
        <p>Tu requerimiento ha sido aprobado.</p>
        <div class="card">
          <p class="label">Número</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Título</p>
          <p class="value">{{titulo}}</p>
          <p class="label" style="margin-top: 15px;">Aprobado por</p>
          <p class="value">{{aprobador}}</p>
          <p class="label" style="margin-top: 15px;">Fecha</p>
          <p class="value">{{fechaAprobacion}}</p>
          {{#if comentario}}
          <p class="label" style="margin-top: 15px;">Comentario</p>
          <p class="value">{{comentario}}</p>
          {{/if}}
        </div>
        <span class="status status-success">APROBADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button">Ver Requerimiento</a>
      </div>
    `),
  },
  {
    eventType: 'REQ_REJECTED',
    subject: 'Requerimiento rechazado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1>Requerimiento Rechazado</h1>
      </div>
      <div class="content">
        <p>Tu requerimiento ha sido rechazado.</p>
        <div class="card" style="border-left-color: #ef4444;">
          <p class="label">Número</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Título</p>
          <p class="value">{{titulo}}</p>
          <p class="label" style="margin-top: 15px;">Rechazado por</p>
          <p class="value">{{aprobador}}</p>
          <p class="label" style="margin-top: 15px;">Motivo</p>
          <p class="value">{{comentario}}</p>
        </div>
        <span class="status status-danger">RECHAZADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button">Ver Requerimiento</a>
      </div>
    `),
  },
  {
    eventType: 'REQ_NEEDS_APPROVAL',
    subject: 'Requerimiento pendiente de tu aprobación - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        <h1>Aprobación Pendiente</h1>
      </div>
      <div class="content">
        <p>Tienes un requerimiento pendiente de aprobación.</p>
        <div class="card" style="border-left-color: #f59e0b;">
          <p class="label">Número</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Título</p>
          <p class="value">{{titulo}}</p>
          <p class="label" style="margin-top: 15px;">Solicitante</p>
          <p class="value">{{solicitante}}</p>
          <p class="label" style="margin-top: 15px;">Monto Estimado</p>
          <p class="value">{{montoEstimado}}</p>
          <p class="label" style="margin-top: 15px;">Nivel de Aprobación</p>
          <p class="value">{{nivelAprobacion}}</p>
        </div>
        <span class="status status-warning">PENDIENTE</span>
        <br><br>
        <a href="{{actionUrl}}" class="button">Revisar y Aprobar</a>
      </div>
    `),
  },

  // ============================================
  // DOCUMENTOS
  // ============================================
  {
    eventType: 'DOC_UPLOADED',
    subject: 'Nuevo documento recibido - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Nuevo Documento</h1>
      </div>
      <div class="content">
        <p>Se ha recibido un nuevo documento.</p>
        <div class="card">
          <p class="label">Documento</p>
          <p class="value">{{titulo}}</p>
          <p class="label" style="margin-top: 15px;">Proveedor</p>
          <p class="value">{{proveedor}}</p>
          <p class="label" style="margin-top: 15px;">Subido por</p>
          <p class="value">{{solicitante}}</p>
        </div>
        <a href="{{actionUrl}}" class="button">Ver Documento</a>
      </div>
    `),
  },
  {
    eventType: 'DOC_APPROVED',
    subject: 'Documento aprobado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Documento Aprobado</h1>
      </div>
      <div class="content">
        <p>Tu documento ha sido aprobado.</p>
        <div class="card">
          <p class="label">Documento</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Aprobado por</p>
          <p class="value">{{aprobador}}</p>
          {{#if comentario}}
          <p class="label" style="margin-top: 15px;">Comentario</p>
          <p class="value">{{comentario}}</p>
          {{/if}}
        </div>
        <span class="status status-success">APROBADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button">Ver Documento</a>
      </div>
    `),
  },
  {
    eventType: 'DOC_REJECTED',
    subject: 'Documento rechazado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1>Documento Rechazado</h1>
      </div>
      <div class="content">
        <p>Tu documento ha sido rechazado.</p>
        <div class="card" style="border-left-color: #ef4444;">
          <p class="label">Documento</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Rechazado por</p>
          <p class="value">{{aprobador}}</p>
          <p class="label" style="margin-top: 15px;">Motivo</p>
          <p class="value">{{comentario}}</p>
        </div>
        <span class="status status-danger">RECHAZADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button">Ver Documento</a>
      </div>
    `),
  },

  // ============================================
  // PROVEEDORES
  // ============================================
  {
    eventType: 'SUPPLIER_INVITED',
    subject: 'Invitación a Hub - Portal de Proveedores',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Bienvenido a Hub</h1>
      </div>
      <div class="content">
        <p>Has sido invitado a formar parte del Portal de Proveedores.</p>
        <div class="card">
          <p class="label">Empresa</p>
          <p class="value">{{proveedor}}</p>
          <p class="label" style="margin-top: 15px;">Invitado por</p>
          <p class="value">{{titulo}}</p>
        </div>
        <p>Para completar tu registro y comenzar a operar, haz clic en el siguiente botón:</p>
        <a href="{{actionUrl}}" class="button">Completar Registro</a>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Este enlace es válido por 7 días. Si tienes alguna pregunta, contacta al equipo de soporte.
        </p>
      </div>
    `),
  },
  {
    eventType: 'SUPPLIER_APPROVED',
    subject: 'Tu registro ha sido aprobado - Hub',
    bodyHtml: baseTemplate(`
      <div class="header">
        <h1>Registro Aprobado</h1>
      </div>
      <div class="content">
        <p>¡Felicitaciones! Tu registro como proveedor ha sido aprobado.</p>
        <div class="card">
          <p class="label">Empresa</p>
          <p class="value">{{proveedor}}</p>
        </div>
        <span class="status status-success">APROBADO</span>
        <p style="margin-top: 20px;">Ya puedes acceder al portal y comenzar a gestionar tus documentos.</p>
        <a href="{{actionUrl}}" class="button">Ir al Portal</a>
      </div>
    `),
  },
  {
    eventType: 'SUPPLIER_REJECTED',
    subject: 'Registro no aprobado - Hub',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1>Registro No Aprobado</h1>
      </div>
      <div class="content">
        <p>Lamentamos informarte que tu registro como proveedor no ha sido aprobado.</p>
        <div class="card" style="border-left-color: #ef4444;">
          <p class="label">Empresa</p>
          <p class="value">{{proveedor}}</p>
          <p class="label" style="margin-top: 15px;">Motivo</p>
          <p class="value">{{comentario}}</p>
        </div>
        <p style="margin-top: 20px;">Si crees que esto es un error o necesitas más información, contacta al equipo de soporte.</p>
      </div>
    `),
  },

  // ============================================
  // PAGOS
  // ============================================
  {
    eventType: 'PAYMENT_ISSUED',
    subject: 'Nuevo pago emitido - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1>Nuevo Pago</h1>
      </div>
      <div class="content">
        <p>Se ha emitido un nuevo pago a tu favor.</p>
        <div class="card" style="border-left-color: #10b981;">
          <p class="label">Número de Pago</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Monto</p>
          <p class="value" style="font-size: 24px; color: #10b981;">{{montoTotal}}</p>
        </div>
        <a href="{{actionUrl}}" class="button" style="background: #10b981;">Ver Detalle del Pago</a>
      </div>
    `),
  },
  {
    eventType: 'PAYMENT_COMPLETED',
    subject: 'Pago completado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1>Pago Completado</h1>
      </div>
      <div class="content">
        <p>El pago ha sido procesado exitosamente.</p>
        <div class="card" style="border-left-color: #10b981;">
          <p class="label">Número de Pago</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Monto</p>
          <p class="value" style="font-size: 24px; color: #10b981;">{{montoTotal}}</p>
        </div>
        <span class="status status-success">PAGADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button" style="background: #10b981;">Ver Comprobantes</a>
      </div>
    `),
  },
  {
    eventType: 'PAYMENT_SCHEDULED',
    subject: 'Pago programado - {{numero}}',
    bodyHtml: baseTemplate(`
      <div class="header" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
        <h1>Pago Programado</h1>
      </div>
      <div class="content">
        <p>Tienes un pago programado próximo.</p>
        <div class="card" style="border-left-color: #3b82f6;">
          <p class="label">Número de Pago</p>
          <p class="value">{{numero}}</p>
          <p class="label" style="margin-top: 15px;">Monto</p>
          <p class="value" style="font-size: 24px; color: #3b82f6;">{{montoTotal}}</p>
          <p class="label" style="margin-top: 15px;">Fecha Programada</p>
          <p class="value">{{fechaAprobacion}}</p>
        </div>
        <span class="status status-info">PROGRAMADO</span>
        <br><br>
        <a href="{{actionUrl}}" class="button" style="background: #3b82f6;">Ver Detalle</a>
      </div>
    `),
  },
];

async function seedTemplates() {
  console.log('🌱 Seeding email templates...');

  for (const template of templates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        eventType: template.eventType,
        tenantId: null,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping ${template.eventType} (already exists)`);
      continue;
    }

    await prisma.emailTemplate.create({
      data: {
        eventType: template.eventType,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        tenantId: null, // Global template
        isActive: true,
      },
    });

    console.log(`  ✅ Created ${template.eventType}`);
  }

  console.log('✅ Email templates seeded successfully!');
}

seedTemplates()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
