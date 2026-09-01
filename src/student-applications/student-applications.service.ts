import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { BranchAccessService } from '../common/branch-access.service';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { UserBranch } from '../users/entities/user-branch.entity';
import { CreateStudentApplicationDto } from './dto/create-student-application.dto';
import { UpdateStudentApplicationDto } from './dto/update-student-application.dto';
import { StudentApplication } from './entities/student-application.entity';
import { StudentApplicationBranch } from './entities/student-application-branch.entity';

export interface MyStudentApplication {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string | null;
  lineId: string | null;
  photoUrl: string | null;
  createdAt: Date;
  branches: { branchId: string; branchName: string; status: string }[];
}

export interface StudentApplicationRow {
  id: string;
  applicationId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string | null;
  lineId: string | null;
  photoUrl: string | null;
  branchId: string;
  branchName: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class StudentApplicationsService {
  constructor(
    @InjectRepository(StudentApplication) private readonly applications: Repository<StudentApplication>,
    @InjectRepository(StudentApplicationBranch) private readonly appBranches: Repository<StudentApplicationBranch>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
    private readonly branchAccess: BranchAccessService,
  ) {}

  /** 'general' accounts apply to become a student for the first time; already-approved
   * 'student' accounts use the same form to apply for an *additional* branch. */
  async submit(userId: string, dto: CreateStudentApplicationDto): Promise<MyStudentApplication> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role !== 'general' && user.role !== 'student') {
      throw new BadRequestException('Only general or student accounts can submit a branch application.');
    }

    const branchIds = [...new Set(dto.branchIds)];
    const foundBranches = await this.branches.find({ where: { id: In(branchIds) } });
    if (foundBranches.length !== branchIds.length) {
      throw new BadRequestException('One or more selected branches were not found.');
    }

    const existingBranchIds = await this.branchAccess.branchIdsOf(userId);
    if (branchIds.some((id) => existingBranchIds.has(id))) {
      throw new BadRequestException("You're already registered at one or more of the selected branches.");
    }

    const open = await this.hasOpenApplication(userId);
    if (open) throw new BadRequestException('You already have an application awaiting a decision.');

    const application = await this.applications.save(
      this.applications.create({
        userId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        nickname: dto.nickname,
        phone: dto.phone ?? null,
        lineId: dto.lineId ?? null,
        photoUrl: dto.photoUrl ?? null,
      }),
    );

    await this.appBranches.save(branchIds.map((branchId) => this.appBranches.create({ applicationId: application.id, branchId })));

    return this.toMyApplication(application, foundBranches, branchIds.map((branchId) => ({ branchId, status: 'pending' as const })));
  }

  async myLatest(userId: string): Promise<MyStudentApplication | null> {
    const application = await this.applications.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    if (!application) return null;

    const rows = await this.appBranches.find({ where: { applicationId: application.id } });
    const branchList = await this.branches.find({ where: { id: In(rows.map((r) => r.branchId)) } });
    return this.toMyApplication(application, branchList, rows);
  }

  async update(userId: string, dto: UpdateStudentApplicationDto): Promise<MyStudentApplication> {
    const application = await this.applications.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    if (!application) throw new NotFoundException('No application found.');

    const rows = await this.appBranches.find({ where: { applicationId: application.id } });
    if (!rows.some((r) => r.status === 'pending')) {
      throw new BadRequestException('This application has already been fully reviewed and can no longer be edited.');
    }

    if (dto.firstName !== undefined) application.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) application.lastName = dto.lastName.trim();
    if (dto.nickname !== undefined) application.nickname = dto.nickname.trim();
    if (dto.phone !== undefined) application.phone = dto.phone.trim() || null;
    if (dto.lineId !== undefined) application.lineId = dto.lineId.trim() || null;
    if (dto.photoUrl !== undefined) application.photoUrl = dto.photoUrl.trim() || null;
    await this.applications.save(application);

    const branchList = await this.branches.find({ where: { id: In(rows.map((r) => r.branchId)) } });
    return this.toMyApplication(application, branchList, rows);
  }

  /** Superadmin sees/acts on every branch's rows; an admin only sees the rows for branches
   * they're actually assigned to via user_branches. */
  async findAll(status: string | undefined, actor: AuthUser): Promise<StudentApplicationRow[]> {
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (actor.role !== 'superadmin') {
      const branchIds = [...(await this.branchAccess.branchIdsOf(actor.id))];
      if (!branchIds.length) return [];
      where.branchId = In(branchIds);
    }

    const rows = await this.appBranches.find({ where, order: { createdAt: 'DESC' } });
    if (!rows.length) return [];

    const applicationIds = [...new Set(rows.map((r) => r.applicationId))];
    const applicationList = await this.applications.find({ where: { id: In(applicationIds) } });
    const applicationById = new Map(applicationList.map((a) => [a.id, a]));

    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const branchList = await this.branches.find({ where: { id: In(branchIds) } });
    const branchNameById = new Map(branchList.map((b) => [b.id, b.name]));

    const result: StudentApplicationRow[] = [];
    for (const row of rows) {
      const application = applicationById.get(row.applicationId);
      if (!application) continue;
      result.push(this.toRow(row, application, branchNameById.get(row.branchId) ?? 'Unknown branch'));
    }
    return result;
  }

  async approve(branchRowId: string, actor: AuthUser): Promise<StudentApplicationRow> {
    const row = await this.getBranchRowOrThrow(branchRowId, actor);
    if (row.status !== 'pending') throw new BadRequestException('This branch has already been reviewed.');

    row.status = 'approved';
    row.reviewedBy = actor.id;
    row.reviewedAt = new Date();
    await this.appBranches.save(row);

    const application = await this.getApplicationOrThrow(row.applicationId);
    await this.grantBranchAccess(application.userId, row.branchId);

    return this.toRow(row, application, await this.branchNameOf(row.branchId));
  }

  async reject(branchRowId: string, actor: AuthUser): Promise<StudentApplicationRow> {
    const row = await this.getBranchRowOrThrow(branchRowId, actor);
    if (row.status !== 'pending') throw new BadRequestException('This branch has already been reviewed.');

    row.status = 'rejected';
    row.reviewedBy = actor.id;
    row.reviewedAt = new Date();
    await this.appBranches.save(row);

    const application = await this.getApplicationOrThrow(row.applicationId);
    return this.toRow(row, application, await this.branchNameOf(row.branchId));
  }

  private async branchNameOf(branchId: string): Promise<string> {
    const branch = await this.branches.findOne({ where: { id: branchId } });
    return branch?.name ?? 'Unknown branch';
  }

  /** A user is blocked from applying again while any branch on their latest application is
   * still undecided — once every branch is approved/rejected, they're free to apply again
   * (e.g. to add a branch, or retry one that was rejected). */
  private async hasOpenApplication(userId: string): Promise<boolean> {
    const latest = await this.applications.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    if (!latest) return false;
    const pending = await this.appBranches.count({ where: { applicationId: latest.id, status: 'pending' } });
    return pending > 0;
  }

  /** Adds the user to the branch (idempotent) and flips their role to student — role is global,
   * so it's granted on the FIRST branch approval and simply re-affirmed by any later one. The
   * first branch a user is ever approved for becomes their primary branch. */
  private async grantBranchAccess(userId: string, branchId: string): Promise<void> {
    const existing = await this.userBranches.findOne({ where: { userId, branchId } });
    if (!existing) {
      const hasAnyBranch = (await this.userBranches.count({ where: { userId } })) > 0;
      await this.userBranches.save(this.userBranches.create({ userId, branchId, isPrimary: !hasAnyBranch }));
      if (!hasAnyBranch) await this.users.update({ id: userId }, { primaryBranchId: branchId });
    }
    await this.users.update({ id: userId }, { role: 'student' });
  }

  private async getBranchRowOrThrow(id: string, actor: AuthUser): Promise<StudentApplicationBranch> {
    const row = await this.appBranches.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Application not found.');
    if (actor.role !== 'superadmin') {
      const branchIds = await this.branchAccess.branchIdsOf(actor.id);
      if (!branchIds.has(row.branchId)) throw new NotFoundException('Application not found.');
    }
    return row;
  }

  private async getApplicationOrThrow(id: string): Promise<StudentApplication> {
    const application = await this.applications.findOne({ where: { id } });
    if (!application) throw new NotFoundException('Application not found.');
    return application;
  }

  private toRow(row: StudentApplicationBranch, application: StudentApplication, branchName: string): StudentApplicationRow {
    return {
      id: row.id,
      applicationId: application.id,
      userId: application.userId,
      email: application.email,
      firstName: application.firstName,
      lastName: application.lastName,
      nickname: application.nickname,
      phone: application.phone,
      lineId: application.lineId,
      photoUrl: application.photoUrl,
      branchId: row.branchId,
      branchName,
      status: row.status,
      createdAt: application.createdAt,
    };
  }

  private toMyApplication(
    application: StudentApplication,
    branchList: Branch[],
    rows: { branchId: string; status: string }[],
  ): MyStudentApplication {
    const branchNameById = new Map(branchList.map((b) => [b.id, b.name]));
    return {
      id: application.id,
      email: application.email,
      firstName: application.firstName,
      lastName: application.lastName,
      nickname: application.nickname,
      phone: application.phone,
      lineId: application.lineId,
      photoUrl: application.photoUrl,
      createdAt: application.createdAt,
      branches: rows.map((r) => ({ branchId: r.branchId, branchName: branchNameById.get(r.branchId) ?? 'Unknown branch', status: r.status })),
    };
  }
}
