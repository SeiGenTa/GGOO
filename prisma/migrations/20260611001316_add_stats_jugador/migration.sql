-- AlterTable
ALTER TABLE "Tarjetas" ALTER COLUMN "venceEn" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "statArmada" INTEGER,
ADD COLUMN     "statAtaque" INTEGER,
ADD COLUMN     "statBloqueo" INTEGER,
ADD COLUMN     "statRecepcion" INTEGER,
ADD COLUMN     "statSaque" INTEGER;
