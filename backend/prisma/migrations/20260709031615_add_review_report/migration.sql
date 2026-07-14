-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "repuveStatus" TEXT,
    "invoiceStatus" TEXT,
    "circulationStatus" TEXT,
    "ownershipNotes" TEXT,
    "riskNotes" TEXT,
    "executiveNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "alerts" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_checkId_key" ON "Review"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_checkId_key" ON "Report"("checkId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE CASCADE ON UPDATE CASCADE;
