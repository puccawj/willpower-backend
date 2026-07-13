import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

export interface BranchWithCounts extends Branch {
  adminCount: number;
  userCount: number;
  eventCount: number;
}

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private readonly branches: Repository<Branch>) {}

  async findAll(): Promise<BranchWithCounts[]> {
    const rows = await this.branches
      .createQueryBuilder('b')
      .where('b.deleted_at IS NULL')
      .orderBy('b.created_at', 'ASC')
      .getMany();

    return this.attachCounts(rows);
  }

  async findOne(id: string): Promise<BranchWithCounts> {
    const branch = await this.branches.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found.');
    const [withCounts] = await this.attachCounts([branch]);
    return withCounts;
  }

  async create(dto: CreateBranchDto, userId: string): Promise<Branch> {
    await this.ensureNameIsUnique(dto.name);

    const branch = this.branches.create({
      name: dto.name,
      city: dto.city ?? null,
      country: dto.country ?? 'Thailand',
      timezone: dto.timezone ?? 'Asia/Bangkok',
      address: dto.address ?? null,
      zipCode: dto.zipCode ?? null,
      phoneCountryCode: dto.phoneCountryCode ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      email: dto.email ?? null,
      logoUrl: dto.logo ?? null,
      status: dto.status ?? 'active',
      code: await this.generateUniqueCode(dto.name),
      createdBy: userId,
      updatedBy: userId,
    });
    return this.branches.save(branch);
  }

  async update(id: string, dto: UpdateBranchDto, userId: string): Promise<Branch> {
    const branch = await this.branches.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found.');

    if (dto.name !== undefined && dto.name.trim().toLowerCase() !== branch.name.trim().toLowerCase()) {
      await this.ensureNameIsUnique(dto.name, id);
    }

    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.city !== undefined) branch.city = dto.city;
    if (dto.country !== undefined) branch.country = dto.country;
    if (dto.timezone !== undefined) branch.timezone = dto.timezone;
    if (dto.address !== undefined) branch.address = dto.address;
    if (dto.zipCode !== undefined) branch.zipCode = dto.zipCode;
    if (dto.phoneCountryCode !== undefined) branch.phoneCountryCode = dto.phoneCountryCode;
    if (dto.phoneNumber !== undefined) branch.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined) branch.email = dto.email;
    if (dto.logo !== undefined) branch.logoUrl = dto.logo;
    if (dto.status !== undefined) branch.status = dto.status;
    branch.updatedBy = userId;

    return this.branches.save(branch);
  }

  async softDelete(id: string): Promise<void> {
    const branch = await this.branches.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found.');

    await this.ensureNotInUse(id);

    branch.status = 'deleted';
    branch.deletedAt = new Date();
    await this.branches.save(branch);
  }

  private async ensureNameIsUnique(name: string, excludeId?: string): Promise<void> {
    const query = this.branches
      .createQueryBuilder('b')
      .where('LOWER(b.name) = LOWER(:name)', { name: name.trim() })
      .andWhere('b.deleted_at IS NULL');

    if (excludeId) query.andWhere('b.id != :excludeId', { excludeId });

    const existing = await query.getOne();
    if (existing) throw new ConflictException('A branch with this name already exists.');
  }

  private async ensureNotInUse(id: string): Promise<void> {
    const [usage] = await this.branches.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE primary_branch_id = $1 AND deleted_at IS NULL) AS users,
         (SELECT COUNT(*) FROM events WHERE branch_id = $1 AND deleted_at IS NULL) AS events,
         (SELECT COUNT(*) FROM donations WHERE branch_id = $1) AS donations,
         (SELECT COUNT(*) FROM course_offerings WHERE branch_id = $1 AND deleted_at IS NULL) AS course_offerings,
         (SELECT COUNT(*) FROM team_members WHERE branch_id = $1) AS team_members,
         (SELECT COUNT(*) FROM admin_branch_access WHERE branch_id = $1) AS admin_branch_access,
         (SELECT COUNT(*) FROM certificate_templates WHERE branch_id = $1) AS certificate_templates`,
      [id],
    );

    const inUse = Object.entries(usage as Record<string, string>).filter(([, count]) => Number(count) > 0);
    if (inUse.length > 0) {
      const parts = inUse.map(([table, count]) => `${count} ${table.replace(/_/g, ' ')}`);
      throw new ConflictException(
        `This branch cannot be deleted because it is still in use: ${parts.join(', ')}.`,
      );
    }
  }

  private async generateUniqueCode(name: string): Promise<string> {
    const base = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) || 'BR';

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
      const candidate = `${base.slice(0, 8)}${suffix}`.slice(0, 10);
      const existing = await this.branches.findOne({ where: { code: candidate }, withDeleted: true });
      if (!existing) return candidate;
    }
    throw new ConflictException('Could not generate a unique branch code, please try again.');
  }

  private async attachCounts(rows: Branch[]): Promise<BranchWithCounts[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const counts = await this.branches.query(
      `SELECT
         b.id AS branch_id,
         COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL) AS user_count,
         COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL AND u.role IN ('admin', 'superadmin')) AS admin_count,
         COUNT(DISTINCT e.id) FILTER (WHERE e.deleted_at IS NULL) AS event_count
       FROM branches b
       LEFT JOIN user_branches ub ON ub.branch_id = b.id
       LEFT JOIN users u ON u.id = ub.user_id
       LEFT JOIN events e ON e.branch_id = b.id
       WHERE b.id = ANY($1)
       GROUP BY b.id`,
      [ids],
    );

    const countMap = new Map<string, { user_count: string; admin_count: string; event_count: string }>(
      counts.map((c: any) => [c.branch_id, c]),
    );

    return rows.map((row) => {
      const c = countMap.get(row.id);
      return {
        ...row,
        userCount: c ? Number(c.user_count) : 0,
        adminCount: c ? Number(c.admin_count) : 0,
        eventCount: c ? Number(c.event_count) : 0,
      };
    });
  }
}
