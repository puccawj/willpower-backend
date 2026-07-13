import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamMember } from './entities/team-member.entity';

export interface TeamMemberWithBranch extends TeamMember {
  branchName: string;
}

export interface PublicTeamMember {
  id: string;
  name: string;
  position: string | null;
  bio: string | null;
  photoUrl: string | null;
  branchName: string;
}

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMember) private readonly members: Repository<TeamMember>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
  ) {}

  async findAll(actor: AuthUser): Promise<TeamMemberWithBranch[]> {
    const rows = await this.members.find({ order: { displayOrder: 'ASC', name: 'ASC' } });
    const withBranch = await this.attachBranchNames(rows);
    if (actor.role === 'superadmin') return withBranch;

    const actorBranchIds = await this.branchIdsOf(actor.id);
    return withBranch.filter((m) => actorBranchIds.has(m.branchId));
  }

  async findOne(id: string, actor: AuthUser): Promise<TeamMemberWithBranch> {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found.');

    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(member.branchId)) throw new NotFoundException('Team member not found.');
    }

    const [withBranch] = await this.attachBranchNames([member]);
    return withBranch;
  }

  async create(dto: CreateTeamMemberDto, actorId: string): Promise<TeamMember> {
    const member = this.members.create({
      branchId: dto.branchId,
      name: dto.name,
      position: dto.position ?? null,
      bio: dto.bio ?? null,
      photoUrl: dto.photo ?? null,
      isShown: dto.isShown ?? true,
      displayOrder: dto.displayOrder ?? 0,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.members.save(member);
  }

  async update(id: string, dto: UpdateTeamMemberDto, actorId: string): Promise<TeamMember> {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found.');

    if (dto.branchId !== undefined) member.branchId = dto.branchId;
    if (dto.name !== undefined) member.name = dto.name;
    if (dto.position !== undefined) member.position = dto.position ?? null;
    if (dto.bio !== undefined) member.bio = dto.bio ?? null;
    if (dto.photo !== undefined) member.photoUrl = dto.photo;
    if (dto.isShown !== undefined) member.isShown = dto.isShown;
    if (dto.displayOrder !== undefined) member.displayOrder = dto.displayOrder;
    member.updatedBy = actorId;

    return this.members.save(member);
  }

  async remove(id: string): Promise<void> {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found.');
    await this.members.delete(id);
  }

  async findAllPublic(): Promise<PublicTeamMember[]> {
    const rows = await this.members.find({ where: { isShown: true }, order: { displayOrder: 'ASC', name: 'ASC' } });
    const withBranch = await this.attachBranchNames(rows);
    return withBranch.map((m) => ({
      id: m.id,
      name: m.name,
      position: m.position,
      bio: m.bio,
      photoUrl: m.photoUrl,
      branchName: m.branchName,
    }));
  }

  private async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  private async attachBranchNames(rows: TeamMember[]): Promise<TeamMemberWithBranch[]> {
    if (rows.length === 0) return [];

    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const branchRows = await this.members.query(`SELECT id, name FROM branches WHERE id = ANY($1)`, [branchIds]);
    const branchNameById = new Map<string, string>(branchRows.map((b: any) => [b.id, b.name]));

    return rows.map((row) => ({ ...row, branchName: branchNameById.get(row.branchId) ?? '—' }));
  }
}
