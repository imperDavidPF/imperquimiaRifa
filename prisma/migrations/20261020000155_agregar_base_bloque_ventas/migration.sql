-- CreateTable
CREATE TABLE "BaseBloqueVentas" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "baseMensual" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BaseBloqueVentas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaseBloqueVentas_participanteId_key" ON "BaseBloqueVentas"("participanteId");

-- AddForeignKey
ALTER TABLE "BaseBloqueVentas" ADD CONSTRAINT "BaseBloqueVentas_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
