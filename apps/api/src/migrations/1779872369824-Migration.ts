import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1779872369824 implements MigrationInterface {
  name = 'Migration1779872369824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "cloudfront_url"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "photos" ADD "cloudfront_url" text`);
  }
}
