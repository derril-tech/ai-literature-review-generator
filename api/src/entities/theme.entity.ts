import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

@Entity('themes')
export class Theme extends BaseEntity {
  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column({ type: 'varchar', length: 256 })
  label!: string;

  @ManyToOne(() => Theme, (t) => t.children, { nullable: true })
  parent?: Theme | null;

  @OneToMany(() => Theme, (t) => t.parent)
  children?: Theme[];

  @Column({ type: 'jsonb', nullable: true })
  provenance?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  summary?: Record<string, unknown> | null;
}
