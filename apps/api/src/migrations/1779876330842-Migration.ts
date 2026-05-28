import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1779876330842 implements MigrationInterface {
    name = 'Migration1779876330842'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "photos" ADD "share_token" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "UQ_c03bc61c6d7544739e557c0dd95" UNIQUE ("share_token")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "UQ_c03bc61c6d7544739e557c0dd95"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "share_token"`);
    }

}
