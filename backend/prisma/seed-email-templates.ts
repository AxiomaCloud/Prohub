import { PrismaClient, NotificationEventType } from '@prisma/client';

const prisma = new PrismaClient();

// Plantillas de email por defecto
const emailTemplates = [
  // Requerimientos
  {
    eventType: 'REQ_SUBMITTED' as NotificationEventType,
    subject: 'Nuevo requerimiento enviado: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Nuevo Requerimiento de Compra</h2>
        <p>Se ha enviado un nuevo requerimiento para tu aprobación:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>Título:</strong> {{titulo}}</p>
          <p><strong>Solicitante:</strong> {{solicitante}}</p>
          <p><strong>Monto Estimado:</strong> {{montoEstimado}}</p>
          <p><strong>Prioridad:</strong> {{prioridad}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Requerimiento</a>
        <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">Este email fue enviado automáticamente por Hub.</p>
      </div>
    `,
    bodyText: 'Nuevo Requerimiento {{numero}}: {{titulo}}. Solicitante: {{solicitante}}. Monto: {{montoEstimado}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'REQ_APPROVED' as NotificationEventType,
    subject: 'Requerimiento aprobado: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Requerimiento Aprobado</h2>
        <p>Tu requerimiento ha sido aprobado:</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>Título:</strong> {{titulo}}</p>
          <p><strong>Aprobado por:</strong> {{aprobador}}</p>
          <p><strong>Fecha:</strong> {{fechaAprobacion}}</p>
          {{#if comentario}}<p><strong>Comentario:</strong> {{comentario}}</p>{{/if}}
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Requerimiento</a>
      </div>
    `,
    bodyText: 'Requerimiento {{numero}} APROBADO. Aprobado por: {{aprobador}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'REQ_REJECTED' as NotificationEventType,
    subject: 'Requerimiento rechazado: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Requerimiento Rechazado</h2>
        <p>Tu requerimiento ha sido rechazado:</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>Título:</strong> {{titulo}}</p>
          <p><strong>Rechazado por:</strong> {{aprobador}}</p>
          <p><strong>Motivo:</strong> {{comentario}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Detalles</a>
      </div>
    `,
    bodyText: 'Requerimiento {{numero}} RECHAZADO. Motivo: {{comentario}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'REQ_NEEDS_APPROVAL' as NotificationEventType,
    subject: 'Tienes un requerimiento pendiente de aprobación: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Aprobación Requerida</h2>
        <p>Se te ha asignado un requerimiento para aprobar:</p>
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>Título:</strong> {{titulo}}</p>
          <p><strong>Solicitante:</strong> {{solicitante}}</p>
          <p><strong>Monto Estimado:</strong> {{montoEstimado}}</p>
          <p><strong>Nivel de Aprobación:</strong> {{nivelAprobacion}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Revisar y Aprobar</a>
      </div>
    `,
    bodyText: 'Tienes un requerimiento pendiente: {{numero}} - {{titulo}}. Solicitante: {{solicitante}}. Revisar en: {{actionUrl}}'
  },

  // Órdenes de Compra
  {
    eventType: 'OC_GENERATED' as NotificationEventType,
    subject: 'Orden de Compra generada: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Orden de Compra Generada</h2>
        <p>Se ha generado una nueva orden de compra:</p>
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número OC:</strong> {{numero}}</p>
          <p><strong>Requerimiento:</strong> {{numeroRequerimiento}}</p>
          <p><strong>Proveedor:</strong> {{proveedor}}</p>
          <p><strong>Monto Total:</strong> {{montoTotal}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Orden de Compra</a>
      </div>
    `,
    bodyText: 'OC {{numero}} generada. Proveedor: {{proveedor}}. Monto: {{montoTotal}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'OC_NEEDS_APPROVAL' as NotificationEventType,
    subject: 'Orden de Compra pendiente de aprobación: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Aprobación de OC Requerida</h2>
        <p>Se te ha asignado una Orden de Compra para aprobar:</p>
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número OC:</strong> {{numero}}</p>
          <p><strong>Proveedor:</strong> {{proveedor}}</p>
          <p><strong>Monto Total:</strong> {{montoTotal}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Revisar y Aprobar</a>
      </div>
    `,
    bodyText: 'OC pendiente: {{numero}}. Proveedor: {{proveedor}}. Monto: {{montoTotal}}. Revisar en: {{actionUrl}}'
  },
  {
    eventType: 'OC_APPROVED' as NotificationEventType,
    subject: 'Orden de Compra aprobada: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Orden de Compra Aprobada</h2>
        <p>La orden de compra ha sido aprobada:</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número OC:</strong> {{numero}}</p>
          <p><strong>Proveedor:</strong> {{proveedor}}</p>
          <p><strong>Aprobado por:</strong> {{aprobador}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Orden de Compra</a>
      </div>
    `,
    bodyText: 'OC {{numero}} APROBADA. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'OC_REJECTED' as NotificationEventType,
    subject: 'Orden de Compra rechazada: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Orden de Compra Rechazada</h2>
        <p>La orden de compra ha sido rechazada:</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número OC:</strong> {{numero}}</p>
          <p><strong>Rechazado por:</strong> {{aprobador}}</p>
          <p><strong>Motivo:</strong> {{comentario}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Detalles</a>
      </div>
    `,
    bodyText: 'OC {{numero}} RECHAZADA. Motivo: {{comentario}}. Ver en: {{actionUrl}}'
  },

  // Recepciones
  {
    eventType: 'RECEPTION_REGISTERED' as NotificationEventType,
    subject: 'Recepción registrada: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Recepción Registrada</h2>
        <p>Se ha registrado una recepción de mercadería:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>OC Asociada:</strong> {{numeroOC}}</p>
          <p><strong>Recibido por:</strong> {{receptor}}</p>
          <p><strong>Fecha:</strong> {{fechaRecepcion}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Recepción</a>
      </div>
    `,
    bodyText: 'Recepción {{numero}} registrada para OC {{numeroOC}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'RECEPTION_COMPLETE' as NotificationEventType,
    subject: 'Recepción completa: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Recepción Completa</h2>
        <p>Se ha completado la recepción de todos los items:</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>OC Asociada:</strong> {{numeroOC}}</p>
          <p><strong>Estado:</strong> Recepción completa</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Detalles</a>
      </div>
    `,
    bodyText: 'Recepción {{numero}} completada para OC {{numeroOC}}. Ver en: {{actionUrl}}'
  },

  // Cotizaciones (RFQ)
  {
    eventType: 'RFQ_INVITATION' as NotificationEventType,
    subject: 'Invitación a cotizar: {{numero}} - {{titulo}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Solicitud de Cotización</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>{{proveedor}}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Has sido invitado a cotizar para el siguiente requerimiento:</p>
          <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Número:</strong> {{numero}}</p>
            <p><strong>Título:</strong> {{titulo}}</p>
            <p><strong>Fecha límite:</strong> {{fechaAprobacion}}</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Ver y Cotizar
            </a>
          </div>
          <p style="color: #6b7280; margin-top: 30px; font-size: 14px; text-align: center;">
            Ingresa al portal de proveedores para ver los detalles y enviar tu cotización.
          </p>
        </div>
      </div>
    `,
    bodyText: 'Has sido invitado a cotizar para {{numero}} - {{titulo}}. Fecha límite: {{fechaAprobacion}}. Cotiza en: {{actionUrl}}'
  },
  {
    eventType: 'RFQ_AWARDED' as NotificationEventType,
    subject: '¡Felicitaciones! Tu cotización fue adjudicada: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">¡Cotización Adjudicada!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>{{proveedor}}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Nos complace informarte que tu cotización ha sido seleccionada:</p>
          <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Número:</strong> {{numero}}</p>
            <p><strong>Título:</strong> {{titulo}}</p>
            <p><strong>Monto adjudicado:</strong> {{montoTotal}}</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Próximamente recibirás la Orden de Compra correspondiente.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Ver Detalles
            </a>
          </div>
        </div>
      </div>
    `,
    bodyText: '¡Tu cotización para {{numero}} - {{titulo}} fue adjudicada! Monto: {{montoTotal}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'RFQ_NOT_AWARDED' as NotificationEventType,
    subject: 'Resultado de cotización: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6b7280; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Proceso de Cotización Finalizado</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>{{proveedor}}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Te informamos que el proceso de cotización ha finalizado y en esta oportunidad tu propuesta no fue seleccionada:</p>
          <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Número:</strong> {{numero}}</p>
            <p><strong>Título:</strong> {{titulo}}</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Agradecemos tu participación y esperamos contar contigo en futuras oportunidades.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Ver Detalles
            </a>
          </div>
        </div>
      </div>
    `,
    bodyText: 'El proceso de cotización {{numero}} - {{titulo}} ha finalizado. En esta oportunidad tu propuesta no fue seleccionada. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'RFQ_QUOTATION_RECEIVED' as NotificationEventType,
    subject: 'Nueva cotización recibida: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Nueva Cotización Recibida</h2>
        <p>Se ha recibido una nueva cotización:</p>
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> {{numero}}</p>
          <p><strong>Proveedor:</strong> {{proveedor}}</p>
          <p><strong>Monto Total:</strong> {{montoTotal}}</p>
        </div>
        <a href="{{actionUrl}}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Cotización</a>
      </div>
    `,
    bodyText: 'Nueva cotización {{numero}} recibida de {{proveedor}}. Monto: {{montoTotal}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'RFQ_DEADLINE_REMINDER' as NotificationEventType,
    subject: 'Recordatorio: Cotización {{numero}} vence pronto',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d97706; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Recordatorio de Vencimiento</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>{{proveedor}}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Te recordamos que la solicitud de cotización está por vencer:</p>
          <div style="background: #fffbeb; border: 1px solid #d97706; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Número:</strong> {{numero}}</p>
            <p><strong>Título:</strong> {{titulo}}</p>
            <p><strong>Estado:</strong> {{comentario}}</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Enviar Cotización
            </a>
          </div>
        </div>
      </div>
    `,
    bodyText: 'Recordatorio: La cotización {{numero}} - {{titulo}} vence pronto. {{comentario}}. Cotiza en: {{actionUrl}}'
  },

  // Orden de Compra al Proveedor
  {
    eventType: 'OC_SUPPLIER_NOTIFIED' as NotificationEventType,
    subject: 'Orden de Compra recibida: {{numero}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Orden de Compra</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>{{proveedor}}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Te informamos que se ha generado una Orden de Compra a tu favor:</p>
          <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Número OC:</strong> {{numero}}</p>
            <p><strong>Monto Total:</strong> {{montoTotal}}</p>
            <p><strong>Fecha de Entrega:</strong> {{fechaAprobacion}}</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Por favor, revisa los detalles en el portal de proveedores.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="{{actionUrl}}" style="display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Ver Orden de Compra
            </a>
          </div>
          <p style="color: #6b7280; margin-top: 30px; font-size: 14px; text-align: center;">
            Gracias por ser nuestro proveedor.
          </p>
        </div>
      </div>
    `,
    bodyText: 'Orden de Compra {{numero}} generada. Monto: {{montoTotal}}. Fecha de entrega: {{fechaAprobacion}}. Ver en: {{actionUrl}}'
  },

  // Delegaciones
  {
    eventType: 'DELEGATION_RECEIVED' as NotificationEventType,
    subject: 'Se te ha delegado la aprobación de {{delegator}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Delegación de Aprobaciones</h2>
        <p>Se te ha delegado la capacidad de aprobar documentos:</p>
        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Delegado por:</strong> {{delegator}}</p>
          <p><strong>Desde:</strong> {{fechaInicio}}</p>
          <p><strong>Hasta:</strong> {{fechaFin}}</p>
          {{#if motivo}}<p><strong>Motivo:</strong> {{motivo}}</p>{{/if}}
        </div>
        <p>Durante este período, podrás aprobar los documentos que normalmente aprueba {{delegator}}.</p>
        <a href="{{actionUrl}}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Mis Aprobaciones</a>
      </div>
    `,
    bodyText: '{{delegator}} te ha delegado sus aprobaciones desde {{fechaInicio}} hasta {{fechaFin}}. Ver en: {{actionUrl}}'
  },
  {
    eventType: 'DELEGATION_EXPIRED' as NotificationEventType,
    subject: 'Delegación de {{delegator}} ha expirado',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Delegación Expirada</h2>
        <p>La delegación de aprobaciones ha finalizado:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Delegado por:</strong> {{delegator}}</p>
          <p><strong>Finalizó:</strong> {{fechaFin}}</p>
        </div>
        <p>Ya no podrás aprobar los documentos que corresponden a {{delegator}}.</p>
      </div>
    `,
    bodyText: 'La delegación de {{delegator}} ha expirado el {{fechaFin}}.'
  },
];

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...');

  // Limpiar plantillas existentes (globales)
  await prisma.emailTemplate.deleteMany({
    where: { tenantId: null }
  });

  for (const template of emailTemplates) {
    await prisma.emailTemplate.create({
      data: {
        tenantId: null, // Plantilla global
        eventType: template.eventType,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText,
        isActive: true,
      },
    });
    console.log(`✅ Created email template: ${template.eventType}`);
  }

  console.log('✅ Email templates seeding completed!');
}

seedEmailTemplates()
  .catch((e) => {
    console.error('❌ Error seeding email templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
