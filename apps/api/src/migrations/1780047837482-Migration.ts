import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1780047837482 implements MigrationInterface {
    name = 'Migration1780047837482'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "album_photos" ("album_id" uuid NOT NULL, "photo_id" uuid NOT NULL, "added_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3b853fa2bd2a58d8067478a3e4b" PRIMARY KEY ("album_id", "photo_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ca161c6e473c8f6a7ff5137c01" ON "album_photos" ("album_id") `);
        await queryRunner.query(`CREATE TABLE "album_members" ("album_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a09bb3b8ecfa41de01fe5e40e9f" PRIMARY KEY ("album_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_edda93dd5a73e8fb4bbb65ac1a" ON "album_members" ("album_id") `);
        await queryRunner.query(`CREATE TABLE "albums" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_838ebae24d2e12082670ffc95d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c6a2dfb05cb87cc38e2a8b9dc" ON "albums" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "album_photos" ADD CONSTRAINT "FK_ca161c6e473c8f6a7ff5137c010" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "album_photos" ADD CONSTRAINT "FK_26bb54cd51f2bfed52600adc8e2" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "album_members" ADD CONSTRAINT "FK_edda93dd5a73e8fb4bbb65ac1a9" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "album_members" ADD CONSTRAINT "FK_d661ce9c3fe849a0a5c56e50d31" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "albums" ADD CONSTRAINT "FK_2c6a2dfb05cb87cc38e2a8b9dc1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "albums" DROP CONSTRAINT "FK_2c6a2dfb05cb87cc38e2a8b9dc1"`);
        await queryRunner.query(`ALTER TABLE "album_members" DROP CONSTRAINT "FK_d661ce9c3fe849a0a5c56e50d31"`);
        await queryRunner.query(`ALTER TABLE "album_members" DROP CONSTRAINT "FK_edda93dd5a73e8fb4bbb65ac1a9"`);
        await queryRunner.query(`ALTER TABLE "album_photos" DROP CONSTRAINT "FK_26bb54cd51f2bfed52600adc8e2"`);
        await queryRunner.query(`ALTER TABLE "album_photos" DROP CONSTRAINT "FK_ca161c6e473c8f6a7ff5137c010"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c6a2dfb05cb87cc38e2a8b9dc"`);
        await queryRunner.query(`DROP TABLE "albums"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_edda93dd5a73e8fb4bbb65ac1a"`);
        await queryRunner.query(`DROP TABLE "album_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca161c6e473c8f6a7ff5137c01"`);
        await queryRunner.query(`DROP TABLE "album_photos"`);
    }

}
