-- CreateTable
CREATE TABLE "OwnershipTransfer" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "fromName" TEXT,
    "fromRfc" TEXT,
    "toName" TEXT,
    "toRfc" TEXT,
    "transferDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnershipTransfer_investigationId_idx" ON "OwnershipTransfer"("investigationId");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_type_idx" ON "OwnershipTransfer"("type");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_status_idx" ON "OwnershipTransfer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipTransfer_investigationId_sequence_key" ON "OwnershipTransfer"("investigationId", "sequence");

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
