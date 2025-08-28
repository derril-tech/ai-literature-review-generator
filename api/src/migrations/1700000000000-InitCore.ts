import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCore1700000000000 implements MigrationInterface {
  name = 'InitCore1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS orgs (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(200) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(200) NOT NULL,
      orgId uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS orgs`);
  }
}

