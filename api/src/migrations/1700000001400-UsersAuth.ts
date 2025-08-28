import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersAuth1700000001400 implements MigrationInterface {
  name = 'UsersAuth1700000001400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "isActive" BOOLEAN DEFAULT false,
        role VARCHAR(50),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create memberships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("userId", "organizationId")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships("organizationId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
