import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsSections1700000001000 implements MigrationInterface {
  name = 'DocumentsSections1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS documents (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      hash varchar(64) NOT NULL UNIQUE,
      doi varchar(512),
      title varchar(1024),
      authors jsonb,
      venue varchar(256),
      year int,
      "s3PdfKey" varchar(512),
      status varchar(32) NOT NULL DEFAULT 'uploaded'
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sections (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "documentId" uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      label varchar(128) NOT NULL,
      "order" int NOT NULL,
      text text NOT NULL
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sections_label ON sections(label)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sections`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
  }
}

