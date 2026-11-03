-- AlterTable
ALTER TABLE "Participante" ADD COLUMN     "supervisorId" TEXT;

-- CreateTable
CREATE TABLE "VentaCanalMes" (
    "id" TEXT NOT NULL,
    "mesClave" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "meta" DOUBLE PRECISION NOT NULL,
    "venta" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VentaCanalMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScalingUpMes" (
    "id" TEXT NOT NULL,
    "mesClave" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,

    CONSTRAINT "ScalingUpMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremioEfectivoConfig" (
    "mesClave" TEXT NOT NULL,
    "presupuestoBase" DOUBLE PRECISION NOT NULL,
    "umbralActivacion" DOUBLE PRECISION NOT NULL DEFAULT 5000000,
    "topeMensual" DOUBLE PRECISION NOT NULL DEFAULT 500000,
    "tramos" JSONB NOT NULL,

    CONSTRAINT "PremioEfectivoConfig_pkey" PRIMARY KEY ("mesClave")
);

-- CreateIndex
CREATE UNIQUE INDEX "VentaCanalMes_mesClave_participanteId_canal_key" ON "VentaCanalMes"("mesClave", "participanteId", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "ScalingUpMes_mesClave_participanteId_key" ON "ScalingUpMes"("mesClave", "participanteId");

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Participante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaCanalMes" ADD CONSTRAINT "VentaCanalMes_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScalingUpMes" ADD CONSTRAINT "ScalingUpMes_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
