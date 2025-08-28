import { MigrationInterface, QueryRunner } from 'typeorm';

export class ThemeSummary1700000001300 implements MigrationInterface {
  name = 'ThemeSummary1700000001300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE themes ADD COLUMN IF NOT EXISTS summary jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE themes DROP COLUMN IF EXISTS summary`);
  }
}
