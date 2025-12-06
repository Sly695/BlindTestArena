-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "spotifyUrl" TEXT,
ALTER COLUMN "answerTime" SET DEFAULT 30;
