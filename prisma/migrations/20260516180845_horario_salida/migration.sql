-- AlterTable
ALTER TABLE "Inscripcion" ADD COLUMN     "tiempoSalidaLista" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tarjetas" ALTER COLUMN "venceEn" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month';
