-- AlterTable
ALTER TABLE "Tarjetas" ALTER COLUMN "venceEn" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "posiciones" TEXT[] DEFAULT ARRAY[]::TEXT[];
