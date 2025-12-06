/*
  Warnings:

  - A unique constraint covering the columns `[gameId,roundIndex]` on the table `Round` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('WAITING', 'STARTED', 'FINISHED', 'REVEALED');

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "status" "RoundStatus" NOT NULL DEFAULT 'WAITING',
ALTER COLUMN "roundIndex" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Round_gameId_roundIndex_key" ON "Round"("gameId", "roundIndex");
