-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "label" TEXT,
    "uuid" TEXT,
    "series" TEXT,
    "folio" TEXT,
    "issuerRfc" TEXT,
    "issuerName" TEXT,
    "receiverRfc" TEXT,
    "receiverName" TEXT,
    "issuedAt" TIMESTAMP(3),
    "certifiedAt" TIMESTAMP(3),
    "pacRfc" TEXT,
    "totalAmount" DECIMAL(14,2),
    "currency" TEXT,
    "cfdiEffect" TEXT,
    "satStatus" TEXT,
    "cancellationStatus" TEXT,
    "satValidatedAt" TIMESTAMP(3),
    "vin" TEXT,
    "engineNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "year" TEXT,
    "version" TEXT,
    "vehicleDescription" TEXT,
    "documentQuality" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalDocument_investigationId_idx" ON "FiscalDocument"("investigationId");

-- CreateIndex
CREATE INDEX "FiscalDocument_type_idx" ON "FiscalDocument"("type");

-- CreateIndex
CREATE INDEX "FiscalDocument_uuid_idx" ON "FiscalDocument"("uuid");

-- CreateIndex
CREATE INDEX "FiscalDocument_satStatus_idx" ON "FiscalDocument"("satStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_investigationId_sequence_key" ON "FiscalDocument"("investigationId", "sequence");

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
