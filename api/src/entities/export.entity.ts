import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

@Entity('exports')
export class Export extends BaseEntity {
  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column({ type: 'varchar', length: 50 })
  type!: string; // 'docx', 'json', 'pdf'

  @Column({ type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fileName?: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string; // 'pending', 'processing', 'completed', 'failed'

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;
}
