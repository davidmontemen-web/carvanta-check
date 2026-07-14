/*
  Warnings:

  - A unique constraint covering the columns `[folio]` on the table `Check` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Check" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "folio" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'executive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Check_folio_key" ON "Check"("folio");

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
