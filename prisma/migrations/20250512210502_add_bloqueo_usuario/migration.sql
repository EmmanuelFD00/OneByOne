/*
  Warnings:

  - You are about to drop the column `estaBloqueado` on the `Versus` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "estaBloqueado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Versus" DROP COLUMN "estaBloqueado";
