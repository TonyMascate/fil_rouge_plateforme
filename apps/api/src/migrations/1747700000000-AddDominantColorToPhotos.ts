import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDominantColorToPhotos1747700000000 implements MigrationInterface {
  name = 'AddDominantColorToPhotos1747700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "dominant_color" character varying(7)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN IF EXISTS "dominant_color"`);
  }
}
