import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWindow1723738353776 implements MigrationInterface {
  name = 'CreateWindow1723738353776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "windows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP(3) WITH TIME ZONE, "is_booked" boolean NOT NULL DEFAULT false, "date" TIMESTAMP(3) WITH TIME ZONE NOT NULL, CONSTRAINT "PK_766fb937641c7c12a272250417f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "windows"`);
  }
}
