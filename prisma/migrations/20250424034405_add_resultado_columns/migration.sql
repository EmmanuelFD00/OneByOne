-- AlterTable
ALTER TABLE "Versus" ADD COLUMN     "enApelacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resultadoConfirmado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resultadoCreador" TEXT,
ADD COLUMN     "resultadoOponente" TEXT;
