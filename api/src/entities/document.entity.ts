import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';
import { Section } from './section.entity';

export type DocumentStatus = 'uploaded' | 'parsed' | 'failed' | 'excluded';

@Entity('documents')
export class Document extends BaseEntity {
  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  hash!: string; // MD5 of PDF bytes

  @Column({ type: 'varchar', length: 512, nullable: true })
  doi!: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  title!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  authors!: { name: string }[] | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  venue!: string | null;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  s3PdfKey!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'uploaded' })
  status!: DocumentStatus;

  @OneToMany(() => Section, (s) => s.document)
  sections!: Section[];
}

