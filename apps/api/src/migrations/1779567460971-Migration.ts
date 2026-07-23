import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1779567460971 implements MigrationInterface {
  name = 'Migration1779567460971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."photos_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "s3_key" character varying NOT NULL, "cloudfront_url" text, "original_name" character varying NOT NULL, "status" "public"."photos_status_enum" NOT NULL DEFAULT 'PENDING', "file_size_bytes" integer, "user_id" uuid NOT NULL, "dominant_color" character varying(7), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5220c45b8e32d49d767b9b3d725" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8c51ec8e8776526b632d4d6395" ON "photos" ("file_size_bytes") `);
    await queryRunner.query(
      `ALTER TABLE "photos" ADD CONSTRAINT "FK_c4404a2ee605249b508c623e68f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_c4404a2ee605249b508c623e68f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8c51ec8e8776526b632d4d6395"`);
    await queryRunner.query(`DROP TABLE "photos"`);
    await queryRunner.query(`DROP TYPE "public"."photos_status_enum"`);
  }
}
