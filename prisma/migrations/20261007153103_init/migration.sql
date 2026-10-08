-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "numeroEmpleado" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "participanteId" TEXT,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL,
    "numeroEmpleado" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamento" TEXT NOT NULL DEFAULT '',
    "puesto" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL,
    "estatus" TEXT NOT NULL DEFAULT 'activo',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentanaVotacion" (
    "mesClave" TEXT NOT NULL,
    "mesEtiqueta" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "abierta" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VentanaVotacion_pkey" PRIMARY KEY ("mesClave")
);

-- CreateTable
CREATE TABLE "VotoHistorico" (
    "id" TEXT NOT NULL,
    "mesClave" TEXT NOT NULL,
    "votanteNumeroEmpleado" TEXT NOT NULL,
    "folios" TEXT[],
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominacion" (
    "id" TEXT NOT NULL,
    "votoId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "boletos" INTEGER NOT NULL,
    "justificacion" TEXT NOT NULL,

    CONSTRAINT "Nominacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreMesVentas" (
    "mesClave" TEXT NOT NULL,
    "mesEtiqueta" TEXT NOT NULL,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "fechaGuardado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),

    CONSTRAINT "CierreMesVentas_pkey" PRIMARY KEY ("mesClave")
);

-- CreateTable
CREATE TABLE "FilaMatriz" (
    "id" TEXT NOT NULL,
    "cierreMesClave" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "cuotaCumplida" BOOLEAN NOT NULL DEFAULT false,
    "bloque" TEXT,
    "ventaExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ventaExtraCastigada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "especificaciones" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FilaMatriz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Premio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "imagenUrl" TEXT,
    "sorteado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Premio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GanadorPremio" (
    "id" TEXT NOT NULL,
    "premioId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "folioGanador" TEXT NOT NULL,
    "fechaSorteo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GanadorPremio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_numeroEmpleado_key" ON "Empleado"("numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_numeroEmpleado_key" ON "Participante"("numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "VotoHistorico_mesClave_votanteNumeroEmpleado_key" ON "VotoHistorico"("mesClave", "votanteNumeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "FilaMatriz_cierreMesClave_participanteId_key" ON "FilaMatriz"("cierreMesClave", "participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "GanadorPremio_premioId_key" ON "GanadorPremio"("premioId");

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominacion" ADD CONSTRAINT "Nominacion_votoId_fkey" FOREIGN KEY ("votoId") REFERENCES "VotoHistorico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominacion" ADD CONSTRAINT "Nominacion_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaMatriz" ADD CONSTRAINT "FilaMatriz_cierreMesClave_fkey" FOREIGN KEY ("cierreMesClave") REFERENCES "CierreMesVentas"("mesClave") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaMatriz" ADD CONSTRAINT "FilaMatriz_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanadorPremio" ADD CONSTRAINT "GanadorPremio_premioId_fkey" FOREIGN KEY ("premioId") REFERENCES "Premio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanadorPremio" ADD CONSTRAINT "GanadorPremio_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
