import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1780048775298 implements MigrationInterface {
  name = 'Migration1780048775298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_ca161c6e473c8f6a7ff5137c01"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_edda93dd5a73e8fb4bbb65ac1a"`);
    await queryRunner.query(`CREATE INDEX "IDX_d661ce9c3fe849a0a5c56e50d3" ON "album_members" ("user_id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_d661ce9c3fe849a0a5c56e50d3"`);
    await queryRunner.query(`CREATE INDEX "IDX_edda93dd5a73e8fb4bbb65ac1a" ON "album_members" ("album_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ca161c6e473c8f6a7ff5137c01" ON "album_photos" ("album_id") `);
  }
}
