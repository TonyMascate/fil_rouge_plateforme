import { MigrationInterface, QueryRunner } from "typeorm";
import { classifyHexToCell } from "@repo/shared";

export class Migration1781639383027 implements MigrationInterface {
    name = 'Migration1781639383027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "photos" ADD "palette" jsonb`);
        await queryRunner.query(`ALTER TABLE "photos" ADD "color_cells" text array`);
        // Index GIN : requêtes « cellId = ANY(color_cells) » et agrégats par cellule.
        await queryRunner.query(`CREATE INDEX "IDX_photos_color_cells" ON "photos" USING GIN ("color_cells")`);

        // Backfill : les photos existantes n'ont qu'une couleur dominante. On leur
        // crée une palette à une entrée (poids 1) classée dans sa cellule d'atlas,
        // pour qu'elles apparaissent dans l'exploration sans retraitement complet.
        const rows = await queryRunner.query(
            `SELECT "id", "dominant_color" FROM "photos" WHERE "dominant_color" IS NOT NULL`,
        ) as Array<{ id: string; dominant_color: string }>;

        for (const row of rows) {
            const cellId = classifyHexToCell(row.dominant_color);
            const palette = JSON.stringify([{ hex: row.dominant_color, cellId, weight: 1 }]);
            await queryRunner.query(
                `UPDATE "photos" SET "palette" = $1::jsonb, "color_cells" = $2 WHERE "id" = $3`,
                [palette, [cellId], row.id],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_photos_color_cells"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "color_cells"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "palette"`);
    }

}
