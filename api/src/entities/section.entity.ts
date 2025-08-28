import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Document } from './document.entity';

@Entity('sections')
export class Section extends BaseEntity {
  @ManyToOne(() => Document, (d) => d.sections, { nullable: false })
  document!: Document;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  label!: string; // e.g., INTRODUCTION, METHODS, RESULTS, DISCUSSION

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'text' })
  text!: string;
}

