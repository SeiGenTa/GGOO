-- AlterTable
ALTER TABLE "Inscripcion" ADD COLUMN     "posicionEnLista" INTEGER;

-- AlterTable
ALTER TABLE "Tarjetas" ALTER COLUMN "venceEn" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month';
