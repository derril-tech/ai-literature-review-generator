import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('audit_log')
export class AuditLog extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 200 })
  action!: string;

  @Column({ type: 'varchar', length: 500 })
  resource!: string;

  @Column({ type: 'int' })
  statusCode!: number;

  @Column({ type: 'int' })
  duration!: number; // milliseconds

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  requestBody?: string;

  @Column({ type: 'int', nullable: true })
  responseSize?: number;
}
