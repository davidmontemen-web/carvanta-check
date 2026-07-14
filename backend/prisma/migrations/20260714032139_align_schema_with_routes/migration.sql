-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "severity" SET DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Artifact_investigationId_idx" ON "Artifact"("investigationId");

-- CreateIndex
CREATE INDEX "Artifact_uploadedById_idx" ON "Artifact"("uploadedById");

-- CreateIndex
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");

-- CreateIndex
CREATE INDEX "Artifact_processingStatus_idx" ON "Artifact"("processingStatus");

-- CreateIndex
CREATE INDEX "Check_status_idx" ON "Check"("status");

-- CreateIndex
CREATE INDEX "Check_assignedToId_idx" ON "Check"("assignedToId");

-- CreateIndex
CREATE INDEX "Check_createdAt_idx" ON "Check"("createdAt");

-- CreateIndex
CREATE INDEX "Document_checkId_idx" ON "Document"("checkId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Evidence_checkId_idx" ON "Evidence"("checkId");

-- CreateIndex
CREATE INDEX "Evidence_investigationId_idx" ON "Evidence"("investigationId");

-- CreateIndex
CREATE INDEX "Evidence_artifactId_idx" ON "Evidence"("artifactId");

-- CreateIndex
CREATE INDEX "Evidence_createdById_idx" ON "Evidence"("createdById");

-- CreateIndex
CREATE INDEX "Evidence_type_idx" ON "Evidence"("type");

-- CreateIndex
CREATE INDEX "Evidence_extractionStatus_idx" ON "Evidence"("extractionStatus");

-- CreateIndex
CREATE INDEX "Finding_investigationId_idx" ON "Finding"("investigationId");

-- CreateIndex
CREATE INDEX "Finding_type_idx" ON "Finding"("type");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Investigation_executiveId_idx" ON "Investigation"("executiveId");

-- CreateIndex
CREATE INDEX "Investigation_status_idx" ON "Investigation"("status");

-- CreateIndex
CREATE INDEX "Investigation_startedAt_idx" ON "Investigation"("startedAt");

-- CreateIndex
CREATE INDEX "Report_riskLevel_idx" ON "Report"("riskLevel");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
