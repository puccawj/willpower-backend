import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { User } from './entities/user.entity';
import { UserBranch } from './entities/user-branch.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

export interface UserWithBranches extends User {
  branchIds: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
  ) {}

  async findAll(actor: AuthUser): Promise<UserWithBranches[]> {
    const list = await this.users.find({ order: { createdAt: 'ASC' } });
    const withBranches = await this.attachBranchIds(list);
    if (actor.role === 'superadmin') return withBranches;

    const actorBranchIds = await this.branchIdsOf(actor.id);
    return withBranches.filter((u) => u.role !== 'superadmin' && u.branchIds.some((id) => actorBranchIds.has(id)));
  }

  async findOne(id: string, actor: AuthUser): Promise<UserWithBranches> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    const [withBranches] = await this.attachBranchIds([user]);

    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      const inScope = withBranches.role !== 'superadmin' && withBranches.branchIds.some((id) => actorBranchIds.has(id));
      if (!inScope) throw new NotFoundException('User not found.');
    }

    return withBranches;
  }

  async create(dto: CreateUserDto, actor: AuthUser): Promise<UserWithBranches> {
    if (dto.role === 'superadmin' && actor.role !== 'superadmin') {
      throw new ForbiddenException('Only a superadmin can create another superadmin account.');
    }

    await this.ensureEmailIsUnique(dto.email);

    const user = this.users.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      role: dto.role,
      registrationSource: 'admin',
      primaryBranchId: dto.branchIds?.[0] ?? null,
      phoneCountryCode: dto.phoneCountryCode ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      status: dto.status ?? 'active',
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.users.save(user);

    if (dto.branchIds) await this.syncBranches(saved.id, dto.branchIds);

    const [withBranches] = await this.attachBranchIds([saved]);
    return withBranches;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser): Promise<UserWithBranches> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    if (actor.role !== 'superadmin' && (user.role === 'superadmin' || dto.role === 'superadmin')) {
      throw new ForbiddenException('Only a superadmin can modify a superadmin account.');
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.phoneCountryCode !== undefined) user.phoneCountryCode = dto.phoneCountryCode;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.password) {
      if (user.registrationSource === 'google' || user.registrationSource === 'facebook') {
        throw new BadRequestException('This account signs in with Google/Facebook and does not use a password.');
      }
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    if (dto.branchIds !== undefined) user.primaryBranchId = dto.branchIds[0] ?? null;
    user.updatedBy = actor.id;

    const saved = await this.users.save(user);

    if (dto.branchIds !== undefined) await this.syncBranches(saved.id, dto.branchIds);

    const [withBranches] = await this.attachBranchIds([saved]);
    return withBranches;
  }

  async softDelete(id: string, actor: AuthUser): Promise<void> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    if (id === actor.id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    if (actor.role !== 'superadmin' && user.role === 'superadmin') {
      throw new ForbiddenException('Only a superadmin can delete a superadmin account.');
    }

    if (user.role === 'superadmin') {
      const remainingSuperadmins = await this.users.count({ where: { role: 'superadmin' } });
      if (remainingSuperadmins <= 1) {
        throw new ConflictException('Cannot delete the last remaining superadmin account.');
      }
    }

    await this.users.softDelete(id);
  }

  private async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  private async syncBranches(userId: string, branchIds: string[]): Promise<void> {
    await this.userBranches.delete({ userId });
    if (branchIds.length === 0) return;

    const rows = branchIds.map((branchId, index) =>
      this.userBranches.create({ userId, branchId, isPrimary: index === 0 }),
    );
    await this.userBranches.save(rows);
  }

  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existing = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .andWhere('u.deleted_at IS NULL')
      .getOne();

    if (existing) throw new ConflictException('A user with this email already exists.');
  }

  private async attachBranchIds(list: User[]): Promise<UserWithBranches[]> {
    if (list.length === 0) return [];

    const links = await this.userBranches.find({ where: { userId: In(list.map((u) => u.id)) } });
    const byUser = new Map<string, string[]>();
    for (const link of links) {
      const arr = byUser.get(link.userId) ?? [];
      arr.push(link.branchId);
      byUser.set(link.userId, arr);
    }

    return list.map((user) => ({ ...user, branchIds: byUser.get(user.id) ?? [] }));
  }
}
