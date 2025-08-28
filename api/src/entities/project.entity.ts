import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Org } from './org.entity';

@Entity('projects')
export class Project extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @ManyToOne(() => Org, (o) => o.projects, { nullable: false })
  org!: Org;
}

