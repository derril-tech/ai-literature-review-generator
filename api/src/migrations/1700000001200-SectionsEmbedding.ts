import { MigrationInterface, QueryRunner } from 'typeorm';

export class SectionsEmbedding1700000001200 implements MigrationInterface {
  name = 'SectionsEmbedding1700000001200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`ALTER TABLE sections ADD COLUMN IF NOT EXISTS embedding vector(384)`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sections_embedding ON sections USING hnsw (embedding vector_cosine_ops)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sections_embedding`);
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN IF EXISTS embedding`);
  }
}

