# Arquitectura Simplificada - Hub con Parse

## 🎯 Concepto Clave

**Hub NO sincroniza nada**. Parse se encarga de toda la sincronización SQL en background.

```
┌──────────────────────────────────────────────────────────────┐
│                         Hub                                │
│  ┌────────────┐         ┌────────────┐                       │
│  │  Frontend  │────────►│  Backend   │                       │
│  │   Next.js  │         │  Express   │                       │
│  └────────────┘         └──────┬─────┘                       │
│                                │                              │
│                                ▼                              │
│                         ┌─────────────┐                       │
│                         │ PostgreSQL  │                       │
│                         │  (Hub)   │                       │
│                         └──────┬──────┘                       │
└────────────────────────────────┼───────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │     Parse (Background)  │
                    │    Sincronización SQL   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │  Softland    │
                         │ (SQL Server) │
                         └──────────────┘
```

**Hub solo**:
- ✅ Lee/escribe en su PostgreSQL
- ✅ Muestra datos al usuario
- ✅ Valida reglas de negocio
- ✅ Genera notificaciones

**Parse solo**:
- ✅ Sincroniza tablas SQL automáticamente
- ✅ Hub ni se entera

---

## Tablas Compartidas (PostgreSQL)

### Estrategia: Misma Base de Datos PostgreSQL

Hub y Parse comparten la **misma instancia PostgreSQL**, pero con **schemas separados**:

```sql
-- Schema de Hub
CREATE SCHEMA hub;

-- Schema de Parse
CREATE SCHEMA parse;

-- Tablas sincronizadas (en schema parse)
CREATE TABLE parse.purchase_requests_sync (
  numero VARCHAR(50) PRIMARY KEY,
  descripcion TEXT,
  monto DECIMAL,
  estado VARCHAR(50),
  solicitante VARCHAR(100),
  departamento VARCHAR(100),
  fecha_creacion TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parse.ordenes_compra_sync (
  numero_oc VARCHAR(50) PRIMARY KEY,
  numero_requerimiento VARCHAR(50),
  monto_total DECIMAL,
  fecha_creacion TIMESTAMP,
  estado VARCHAR(50),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parse.recepciones_sync (
  numero_recepcion VARCHAR(50) PRIMARY KEY,
  numero_oc VARCHAR(50),
  fecha_recepcion TIMESTAMP,
  receptor VARCHAR(100),
  estado VARCHAR(50),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);
```

### ¿Cómo funciona?

1. **Hub escribe en `hub.purchase_requests`**
   - Usuario crea/aprueba PR en Hub
   - Se guarda en tabla nativa de Hub (Prisma)

2. **Trigger PostgreSQL copia a tabla sync**
   ```sql
   CREATE OR REPLACE FUNCTION hub.sync_pr_to_parse()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO parse.purchase_requests_sync (
       numero, descripcion, monto, estado, solicitante, departamento, fecha_creacion
     ) VALUES (
       NEW.number, NEW.description, NEW."estimatedAmount", NEW.status,
       NEW."requestedBy", NEW.department, NEW."createdAt"
     )
     ON CONFLICT (numero) DO UPDATE SET
       descripcion = EXCLUDED.descripcion,
       monto = EXCLUDED.monto,
       estado = EXCLUDED.estado,
       fecha_modificacion = NOW();

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER sync_pr_after_insert_update
   AFTER INSERT OR UPDATE ON hub."PurchaseRequest"
   FOR EACH ROW EXECUTE FUNCTION hub.sync_pr_to_parse();
   ```

3. **Parse sincroniza tabla sync → Softland SQL**
   - Job cada 5 min lee `parse.purchase_requests_sync`
   - WHERE fecha_modificacion > ultima_sync
   - INSERT/UPDATE en Softland

4. **Parse sincroniza Softland → tabla sync**
   - Job cada 5 min lee Softland.OrdenesCompra
   - INSERT/UPDATE en `parse.ordenes_compra_sync`

5. **Hub lee tabla sync para mostrar OCs**
   ```sql
   -- En Hub
   SELECT * FROM parse.ordenes_compra_sync
   WHERE numero_requerimiento = 'PR-2025-00042';
   ```

6. **Trigger PostgreSQL actualiza tabla Hub**
   ```sql
   CREATE OR REPLACE FUNCTION parse.sync_oc_to_hub()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Buscar Purchase Request
     UPDATE hub."PurchaseRequest"
     SET status = 'PO_CREATED',
         "updatedAt" = NOW()
     WHERE number = NEW.numero_requerimiento;

     -- Crear Purchase Order si no existe
     INSERT INTO hub."PurchaseOrder" (
       id, number, amount, status, "clientTenantId", date, "createdAt", "updatedAt"
     )
     SELECT
       gen_random_uuid(),
       NEW.numero_oc,
       NEW.monto_total,
       'ACTIVE',
       pr."tenantId",
       NEW.fecha_creacion,
       NOW(),
       NOW()
     FROM hub."PurchaseRequest" pr
     WHERE pr.number = NEW.numero_requerimiento
     ON CONFLICT (number) DO NOTHING;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER sync_oc_to_hub_trigger
   AFTER INSERT OR UPDATE ON parse.ordenes_compra_sync
   FOR EACH ROW EXECUTE FUNCTION parse.sync_oc_to_hub();
   ```

---

## Sistema de Notificaciones

### Modelo de Datos

```prisma
// Ya existe en schema.prisma
model Notification {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id])

  type      NotificationType
  title     String
  message   String            @db.Text
  data      Json?             // Datos adicionales (IDs, etc.)

  // Prioridad
  priority  NotificationPriority @default(NORMAL)

  // Estado
  readAt    DateTime?
  clickedAt DateTime?
  dismissedAt DateTime?

  // Canal
  channel   CommunicationChannel
  sentAt    DateTime?

  createdAt DateTime          @default(now())
  expiresAt DateTime?         // Notificaciones temporales

  @@index([userId, readAt])
  @@index([userId, type])
  @@index([createdAt])
}

enum NotificationType {
  // Purchase Requests
  PR_CREATED
  PR_SUBMITTED
  PR_APPROVAL_REQUIRED
  PR_APPROVED
  PR_REJECTED
  PR_CHANGES_REQUESTED
  PR_SENT_TO_ERP

  // Purchase Orders
  PO_CREATED
  PO_UPDATED
  PO_CANCELLED

  // Recepciones
  RECEPTION_PENDING           // OC esperando recepción
  RECEPTION_OVERDUE           // OC vencida sin recepción
  RECEPTION_CREATED
  RECEPTION_PARTIAL
  RECEPTION_COMPLETED

  // Documentos (existente)
  DOCUMENT_UPLOADED
  DOCUMENT_PARSED
  DOCUMENT_STATUS_CHANGED
  PAYMENT_ISSUED
  MESSAGE_RECEIVED
  APPROVAL_REQUIRED
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

// Widget de notificaciones
model NotificationPreferences {
  id       String  @id @default(cuid())
  userId   String  @unique
  user     User    @relation(fields: [userId], references: [id])

  // Preferencias por tipo
  preferences Json
  /*
  {
    "PR_APPROVAL_REQUIRED": {
      "portal": true,
      "email": true,
      "push": false
    },
    "PO_CREATED": {
      "portal": true,
      "email": false,
      "push": false
    }
  }
  */

  // Horarios
  quietHoursStart  String?  // "22:00"
  quietHoursEnd    String?  // "08:00"
  timezone         String   @default("America/Argentina/Buenos_Aires")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Eventos que Generan Notificaciones

```typescript
// /backend/src/services/notificationService.ts

class NotificationService {

  /**
   * Purchase Request creado
   */
  async notifyPRCreated(purchaseRequestId: string) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: { requestedByUser: true }
    });

    await this.createNotification({
      userId: pr.requestedBy,
      type: 'PR_CREATED',
      priority: 'NORMAL',
      title: 'Requerimiento creado',
      message: `Tu requerimiento ${pr.number} ha sido creado exitosamente.`,
      data: { purchaseRequestId, prNumber: pr.number },
      channel: 'PORTAL'
    });
  }

  /**
   * Purchase Request requiere aprobación
   */
  async notifyApprovalRequired(purchaseRequestId: string, approvalLevel: number) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: { requestedByUser: true }
    });

    // Obtener aprobadores del nivel
    const level = await prisma.approvalLevel.findFirst({
      where: {
        tenantId: pr.tenantId,
        level: approvalLevel
      }
    });

    // Buscar usuarios con los roles apropiados
    const approvers = await prisma.user.findMany({
      where: {
        tenantMemberships: {
          some: {
            tenantId: pr.tenantId,
            roles: { hasSome: level.approverRoles }
          }
        }
      }
    });

    // Notificar a cada aprobador
    for (const approver of approvers) {
      await this.createNotification({
        userId: approver.id,
        type: 'PR_APPROVAL_REQUIRED',
        priority: pr.priority === 'URGENT' ? 'URGENT' : 'HIGH',
        title: 'Aprobación requerida',
        message: `El requerimiento ${pr.number} (${pr.description}) requiere tu aprobación. Monto: $${pr.estimatedAmount}`,
        data: {
          purchaseRequestId,
          prNumber: pr.number,
          amount: pr.estimatedAmount,
          requestedBy: pr.requestedByUser.name
        },
        channel: 'PORTAL'
      });

      // Enviar email si el monto es alto o prioridad URGENT
      if (pr.estimatedAmount > 50000 || pr.priority === 'URGENT') {
        await this.sendEmailNotification(approver.email, {
          subject: `⚠️ Aprobación urgente requerida - ${pr.number}`,
          template: 'approval-required',
          data: { pr, approver }
        });
      }
    }
  }

  /**
   * Purchase Request aprobado
   */
  async notifyPRApproved(purchaseRequestId: string) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId }
    });

    await this.createNotification({
      userId: pr.requestedBy,
      type: 'PR_APPROVED',
      priority: 'NORMAL',
      title: '✅ Requerimiento aprobado',
      message: `Tu requerimiento ${pr.number} ha sido aprobado y enviado al ERP.`,
      data: { purchaseRequestId, prNumber: pr.number },
      channel: 'PORTAL'
    });
  }

  /**
   * Purchase Request rechazado
   */
  async notifyPRRejected(purchaseRequestId: string, reason: string) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId }
    });

    await this.createNotification({
      userId: pr.requestedBy,
      type: 'PR_REJECTED',
      priority: 'HIGH',
      title: '❌ Requerimiento rechazado',
      message: `Tu requerimiento ${pr.number} ha sido rechazado. Motivo: ${reason}`,
      data: { purchaseRequestId, prNumber: pr.number, reason },
      channel: 'PORTAL'
    });
  }

  /**
   * Orden de Compra creada (disparado por trigger de Parse sync)
   */
  async notifyPOCreated(purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        purchaseRequests: {
          include: { requestedByUser: true }
        }
      }
    });

    // Notificar a todos los solicitantes de PRs vinculados
    const uniqueRequesters = new Set(
      po.purchaseRequests.map(pr => pr.requestedBy)
    );

    for (const userId of uniqueRequesters) {
      await this.createNotification({
        userId,
        type: 'PO_CREATED',
        priority: 'NORMAL',
        title: '📄 Orden de Compra generada',
        message: `Se ha generado la OC ${po.number} por $${po.amount}`,
        data: {
          purchaseOrderId,
          poNumber: po.number,
          amount: po.amount
        },
        channel: 'PORTAL'
      });
    }

    // Notificar a equipo de compras/almacén que hay una OC pendiente de recepción
    await this.notifyReceptionPending(purchaseOrderId);
  }

  /**
   * OC pendiente de recepción
   */
  async notifyReceptionPending(purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId }
    });

    // Buscar usuarios con permiso de recepción
    const receivers = await prisma.user.findMany({
      where: {
        tenantMemberships: {
          some: {
            tenantId: po.clientTenantId,
            roles: { hasSome: ['CLIENT_ADMIN'] }
          }
        }
      }
    });

    for (const receiver of receivers) {
      await this.createNotification({
        userId: receiver.id,
        type: 'RECEPTION_PENDING',
        priority: 'NORMAL',
        title: '📦 OC pendiente de recepción',
        message: `La orden de compra ${po.number} está esperando recepción de mercadería.`,
        data: { purchaseOrderId, poNumber: po.number },
        channel: 'PORTAL'
      });
    }
  }

  /**
   * OC vencida sin recepción (Job diario)
   */
  async notifyOverdueReceptions() {
    const overduePos = await prisma.purchaseOrder.findMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: new Date() },
        receptions: { none: {} } // Sin recepciones
      }
    });

    for (const po of overduePos) {
      const receivers = await prisma.user.findMany({
        where: {
          tenantMemberships: {
            some: {
              tenantId: po.clientTenantId,
              roles: { hasSome: ['CLIENT_ADMIN'] }
            }
          }
        }
      });

      for (const receiver of receivers) {
        await this.createNotification({
          userId: receiver.id,
          type: 'RECEPTION_OVERDUE',
          priority: 'URGENT',
          title: '⚠️ OC vencida sin recepción',
          message: `La OC ${po.number} venció el ${po.dueDate.toLocaleDateString()} y aún no tiene recepción.`,
          data: { purchaseOrderId: po.id, poNumber: po.number, dueDate: po.dueDate },
          channel: 'PORTAL',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
        });
      }
    }
  }

  /**
   * Recepción completada
   */
  async notifyReceptionCompleted(receptionId: string) {
    const reception = await prisma.purchaseReception.findUnique({
      where: { id: receptionId },
      include: {
        purchaseOrder: {
          include: {
            purchaseRequests: {
              include: { requestedByUser: true }
            }
          }
        }
      }
    });

    // Notificar al solicitante original
    const uniqueRequesters = new Set(
      reception.purchaseOrder.purchaseRequests.map(pr => pr.requestedBy)
    );

    for (const userId of uniqueRequesters) {
      await this.createNotification({
        userId,
        type: 'RECEPTION_COMPLETED',
        priority: 'NORMAL',
        title: '✅ Mercadería recibida',
        message: `Se ha recibido la mercadería de la OC ${reception.purchaseOrder.number}.`,
        data: {
          receptionId,
          receptionNumber: reception.number,
          poNumber: reception.purchaseOrder.number
        },
        channel: 'PORTAL'
      });
    }
  }

  /**
   * Helper: crear notificación
   */
  async createNotification(data: CreateNotificationInput) {
    // Verificar preferencias del usuario
    const prefs = await prisma.notificationPreferences.findUnique({
      where: { userId: data.userId }
    });

    const shouldSend = this.shouldSendNotification(data.type, data.channel, prefs);

    if (!shouldSend) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        ...data,
        sentAt: new Date()
      }
    });

    // Emitir via WebSocket para notificación en tiempo real
    this.emitRealtimeNotification(data.userId, notification);

    return notification;
  }

  /**
   * Helper: emitir notificación en tiempo real (Socket.io)
   */
  emitRealtimeNotification(userId: string, notification: any) {
    const io = global.io; // Socket.io instance
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }
  }
}
```

### Widget de Notificaciones (Frontend)

```typescript
// /frontend/src/components/notifications/NotificationBell.tsx

export function NotificationBell() {
  const { data: notifications, mutate } = useSWR('/api/v1/notifications/unread');
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.readAt).length || 0;

  useEffect(() => {
    // Conectar a WebSocket para notificaciones en tiempo real
    const socket = io(process.env.NEXT_PUBLIC_API_URL);

    socket.on('notification', (notification) => {
      // Agregar nueva notificación
      mutate();

      // Mostrar toast
      toast.info(notification.title, {
        description: notification.message,
        action: {
          label: 'Ver',
          onClick: () => handleNotificationClick(notification)
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0">
        <NotificationList
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      </PopoverContent>
    </Popover>
  );
}
```

### Dashboard de Notificaciones

```typescript
// /frontend/src/app/notifications/page.tsx

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'pr' | 'po'>('all');

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">No leídas</TabsTrigger>
          <TabsTrigger value="pr">Requerimientos</TabsTrigger>
          <TabsTrigger value="po">Órdenes de Compra</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationList filter="all" />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationList filter="unread" />
        </TabsContent>

        <TabsContent value="pr">
          <NotificationList filter="pr" />
        </TabsContent>

        <TabsContent value="po">
          <NotificationList filter="po" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Resumen: Flujo Completo Simplificado

### 1. Usuario crea Purchase Request
```
1. Frontend envía POST /api/v1/purchase-requests
2. Backend crea en hub.PurchaseRequest
3. Trigger PostgreSQL copia a parse.purchase_requests_sync
4. Parse sincroniza (background) → Softland
5. Notificación: "Requerimiento creado"
```

### 2. Aprobador recibe notificación
```
1. Trigger/Service detecta PR en estado PENDING
2. NotificationService.notifyApprovalRequired()
3. Frontend muestra badge en Bell icon
4. WebSocket push notification en tiempo real
```

### 3. Parse sincroniza OC desde Softland
```
1. Parse job lee Softland.OrdenesCompra (cada 5 min)
2. INSERT en parse.ordenes_compra_sync
3. Trigger PostgreSQL:
   - Crea en hub.PurchaseOrder
   - Actualiza hub.PurchaseRequest (status = PO_CREATED)
4. Trigger dispara NotificationService.notifyPOCreated()
5. Usuario ve notificación "OC generada"
```

### 4. Usuario recibe mercadería
```
1. Frontend POST /api/v1/receptions
2. Backend crea en hub.PurchaseReception
3. Trigger copia a parse.recepciones_sync
4. Parse sincroniza → Softland
5. Notificación: "Recepción completada"
```

---

## Ventajas de esta Arquitectura

✅ **Hub ultra simple**: Solo CRUD PostgreSQL
✅ **Parse hace todo el trabajo pesado**: SQL sync
✅ **Triggers automatizan todo**: Cero jobs en Hub
✅ **Notificaciones en tiempo real**: WebSocket + polling
✅ **Escalable**: Parse puede sincronizar N tenants
✅ **Debugging fácil**: Ver tablas sync directamente
✅ **Flexible**: Cambiar ERP = reconfigurar Parse

---

**Documento creado**: 2025-11-28
**Versión**: 3.0 (Arquitectura Simplificada)
