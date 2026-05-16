-- CreateTable
CREATE TABLE "Tarjetas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoCarta" TEXT NOT NULL,
    "razon" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL,
    "quienAsignoId" TEXT,

    CONSTRAINT "Tarjetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReclamosCarta" (
    "id" TEXT NOT NULL,
    "tarjetaId" TEXT NOT NULL,
    "razon" TEXT NOT NULL,
    "fechaReclamo" TIMESTAMP(3) NOT NULL,
    "atendido" BOOLEAN NOT NULL DEFAULT false,
    "respuesta" TEXT,
    "administradorAtendioId" TEXT,

    CONSTRAINT "ReclamosCarta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Castigo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoCastigo" TEXT NOT NULL,
    "razon" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fueCancelada" BOOLEAN NOT NULL DEFAULT false,
    "quienCanceloId" TEXT,
    "razonCancelacion" TEXT,

    CONSTRAINT "Castigo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tarjetas" ADD CONSTRAINT "Tarjetas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarjetas" ADD CONSTRAINT "Tarjetas_quienAsignoId_fkey" FOREIGN KEY ("quienAsignoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamosCarta" ADD CONSTRAINT "ReclamosCarta_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "Tarjetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamosCarta" ADD CONSTRAINT "ReclamosCarta_administradorAtendioId_fkey" FOREIGN KEY ("administradorAtendioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Castigo" ADD CONSTRAINT "Castigo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Castigo" ADD CONSTRAINT "Castigo_quienCanceloId_fkey" FOREIGN KEY ("quienCanceloId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
