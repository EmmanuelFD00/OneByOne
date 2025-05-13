-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "Versus" ADD COLUMN     "estaBloqueado" BOOLEAN NOT NULL DEFAULT false;
