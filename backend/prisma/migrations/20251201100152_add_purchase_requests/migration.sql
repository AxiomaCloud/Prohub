-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('BORRADOR', 'ENVIADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PurchaseRequestPriority" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estado" "PurchaseRequestStatus" NOT NULL DEFAULT 'BORRADOR',
    "prioridad" "PurchaseRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "categoria" TEXT NOT NULL,
    "justificacion" TEXT,
    "montoEstimado" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "tenantId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "creadoPorIA" BOOLEAN NOT NULL DEFAULT false,
    "promptOriginal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "especificaciones" TEXT,
    "unidadMedida" TEXT,
    "precioEstimado" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_numero_key" ON "PurchaseRequest"("numero");

-- CreateIndex
CREATE INDEX "PurchaseRequest_tenantId_estado_idx" ON "PurchaseRequest"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "PurchaseRequest_solicitanteId_idx" ON "PurchaseRequest"("solicitanteId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_numero_idx" ON "PurchaseRequest"("numero");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_purchaseRequestId_idx" ON "PurchaseRequestItem"("purchaseRequestId");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
