-- AlterTable
ALTER TABLE "VentaCanalMes" ADD COLUMN     "cebe" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PremioEfectivoConfig" ADD COLUMN     "cebesScalingUp" JSONB NOT NULL DEFAULT '["KAM NORTE","KAM SURESTE","KAM CENTRO"]';

-- DropForeignKey
ALTER TABLE "ScalingUpMes" DROP CONSTRAINT "ScalingUpMes_participanteId_fkey";

-- DropTable
DROP TABLE "ScalingUpMes";
