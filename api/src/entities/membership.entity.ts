import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './org.entity';

@Entity('memberships')
export class Membership extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @ManyToOne(() => Organization, { nullable: false })
  organization!: Organization;

  @Column({ type: 'varchar', length: 50, default: 'member' })
  role!: string; // 'owner', 'admin', 'member', 'viewer'

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
