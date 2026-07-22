-- CreateTable
CREATE TABLE "InvoiceInvestigatorAnalysis" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "researcherId" TEXT NOT NULL,
    "documentQuality" TEXT,
    "documentsLegibility" TEXT,
    "hasIncompleteDocs" BOOLEAN,
    "allCfdiValidated" TEXT,
    "hasSatInconsistency" BOOLEAN,
    "satNotes" TEXT,
    "chainStatus" TEXT,
    "chronologyStatus" TEXT,
    "currentOwnerIdentified" BOOLEAN,
    "hasEndorsements" BOOLEAN,
    "endorsementsLegibility" TEXT,
    "signaturesPresent" TEXT,
    "datesPresent" TEXT,
    "hasCancelledEndorsements" BOOLEAN,
    "refacturaCount" INTEGER NOT NULL DEFAULT 0,
    "refacturaRelation" TEXT,
    "technicalObservations" TEXT,
    "conclusion" TEXT,
    "researcherConfidence" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceInvestigatorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInvestigatorAnalysis_investigationId_key" ON "InvoiceInvestigatorAnalysis"("investigationId");

-- CreateIndex
CREATE INDEX "InvoiceInvestigatorAnalysis_researcherId_idx" ON "InvoiceInvestigatorAnalysis"("researcherId");

-- CreateIndex
CREATE INDEX "InvoiceInvestigatorAnalysis_chainStatus_idx" ON "InvoiceInvestigatorAnalysis"("chainStatus");

-- CreateIndex
CREATE INDEX "InvoiceInvestigatorAnalysis_researcherConfidence_idx" ON "InvoiceInvestigatorAnalysis"("researcherConfidence");

-- AddForeignKey
ALTER TABLE "InvoiceInvestigatorAnalysis" ADD CONSTRAINT "InvoiceInvestigatorAnalysis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceInvestigatorAnalysis" ADD CONSTRAINT "InvoiceInvestigatorAnalysis_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
