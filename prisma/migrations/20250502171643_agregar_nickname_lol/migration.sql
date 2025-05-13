-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nicknameEditadoLOL" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nicknameLOL" TEXT;

-- CreateTable
CREATE TABLE "NicknameBloqueado" (
    "id" SERIAL NOT NULL,
    "juego" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,

    CONSTRAINT "NicknameBloqueado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NicknameBloqueado_nickname_key" ON "NicknameBloqueado"("nickname");
