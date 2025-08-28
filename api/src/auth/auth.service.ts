import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/org.entity';
import { Membership } from '../entities/membership.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.users.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  async register(email: string, password: string, name: string, orgName: string) {
    // Check if user already exists
    const existingUser = await this.users.findOne({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.users.create({
      email,
      passwordHash,
      name,
      isActive: true,
      role: 'user'
    });
    await this.users.save(user);

    // Create organization
    const organization = this.organizations.create({
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, '-')
    });
    await this.organizations.save(organization);

    // Create membership (user is owner)
    const membership = this.memberships.create({
      user,
      organization,
      role: 'owner',
      isActive: true
    });
    await this.memberships.save(membership);

    return this.login(user);
  }

  async getUserOrganizations(userId: string) {
    return this.memberships.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['organization']
    });
  }

  async checkUserPermission(userId: string, organizationId: string, requiredRole: string = 'member') {
    const membership = await this.memberships.findOne({
      where: { 
        user: { id: userId }, 
        organization: { id: organizationId },
        isActive: true
      }
    });

    if (!membership) {
      return false;
    }

    const roleHierarchy = {
      'owner': 4,
      'admin': 3,
      'member': 2,
      'viewer': 1
    };

    return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
  }
}
