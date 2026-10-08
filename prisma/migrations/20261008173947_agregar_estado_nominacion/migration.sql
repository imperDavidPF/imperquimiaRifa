-- AlterTable
ALTER TABLE "Nominacion" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "fechaRevision" TIMESTAMP(3);
