import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

@Entity('orgs')
export class Org extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @OneToMany(() => Project, (p) => p.org)
  projects!: Project[];
}

