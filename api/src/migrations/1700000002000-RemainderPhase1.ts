import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemainderPhase11700000002000 implements MigrationInterface {
  name = 'RemainderPhase11700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users & memberships
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      email varchar(320) UNIQUE NOT NULL,
      name varchar(200),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS memberships (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      userId uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      orgId uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      role varchar(64) NOT NULL,
      UNIQUE(userId, orgId),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Figures & tables extracted from PDFs
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS figures (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "documentId" uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      caption text,
      page int,
      s3Key varchar(512),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS tables (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "documentId" uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      schema jsonb,
      data jsonb,
      page int,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Themes & assignments
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS themes (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label varchar(256) NOT NULL,
      parentId uuid REFERENCES themes(id) ON DELETE SET NULL,
      provenance jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS theme_assignments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      themeId uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      documentId uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      weight real NOT NULL,
      UNIQUE(themeId, documentId),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Methods, metrics, datasets
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS methods (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(256) NOT NULL,
      meta jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS metrics (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(256) NOT NULL,
      unit varchar(64),
      meta jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS datasets (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(256) NOT NULL,
      size int,
      meta jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Q&A sessions & answers
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS qa_sessions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      question text NOT NULL,
      filters jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS answers (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sessionId uuid NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
      text text NOT NULL,
      reasoning jsonb,
      confidence real,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Citations
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS citations (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      answerId uuid REFERENCES answers(id) ON DELETE CASCADE,
      documentId uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      snippet text,
      score real,
      ref jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Citation bundles & exports
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS citation_bundles (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      themeId uuid REFERENCES themes(id) ON DELETE SET NULL,
      papers jsonb,
      quotes jsonb,
      bibtex text,
      csl jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS exports (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kind varchar(32) NOT NULL,
      s3Key varchar(512) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'pending',
      meta jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // Audit log
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS audit_log (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      actorId uuid REFERENCES users(id) ON DELETE SET NULL,
      action varchar(64) NOT NULL,
      target varchar(64),
      meta jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS exports`);
    await queryRunner.query(`DROP TABLE IF EXISTS citation_bundles`);
    await queryRunner.query(`DROP TABLE IF EXISTS citations`);
    await queryRunner.query(`DROP TABLE IF EXISTS answers`);
    await queryRunner.query(`DROP TABLE IF EXISTS qa_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS datasets`);
    await queryRunner.query(`DROP TABLE IF EXISTS metrics`);
    await queryRunner.query(`DROP TABLE IF EXISTS methods`);
    await queryRunner.query(`DROP TABLE IF EXISTS theme_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS themes`);
    await queryRunner.query(`DROP TABLE IF EXISTS tables`);
    await queryRunner.query(`DROP TABLE IF EXISTS figures`);
    await queryRunner.query(`DROP TABLE IF EXISTS memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}

