-- AlterTable
ALTER TABLE "Participante" ADD COLUMN     "excluidoBoletos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "excluidoPremioEfectivo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PremioEfectivoConfig" ALTER COLUMN "cebesScalingUp" DROP DEFAULT;
