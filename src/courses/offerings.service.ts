import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseOffering } from './entities/course-offering.entity';
import { Course } from './entities/course.entity';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';

export interface OfferingWithDetails extends CourseOffering {
  courseTitle: string;
  totalSessions: number;
  branchName: string;
  instructorName: string | null;
  enrolledCount: number;
}

const DEFAULT_START_TIME = '18:00:00';
const DEFAULT_END_TIME = '20:00:00';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseSession) private readonly sessions: Repository<CourseSession>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
  ) {}

  async findAll(actor: AuthUser): Promise<OfferingWithDetails[]> {
    const rows = await this.offerings.find({ order: { startDate: 'ASC' } });
    const withDetails = await this.attachDetails(rows);

    if (actor.role === 'superadmin') return withDetails;
    if (actor.role === 'instructor') return withDetails.filter((o) => o.instructorId === actor.id);

    const actorBranchIds = await this.branchIdsOf(actor.id);
    return withDetails.filter((o) => actorBranchIds.has(o.branchId));
  }

  async findOne(id: string, actor: AuthUser): Promise<OfferingWithDetails> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');

    if (actor.role === 'instructor' && offering.instructorId !== actor.id) {
      throw new NotFoundException('Offering not found.');
    }
    if (actor.role !== 'superadmin' && actor.role !== 'instructor') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
    }

    const [withDetails] = await this.attachDetails([offering]);
    return withDetails;
  }

  async create(dto: CreateOfferingDto, actorId: string): Promise<CourseOffering> {
    this.ensureEndAfterStart(dto.startDate, dto.endDate);

    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException('Course not found.');

    const offering = this.offerings.create({
      courseId: dto.courseId,
      branchId: dto.branchId,
      instructorId: dto.instructorId ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      capacity: dto.capacity ?? null,
      location: dto.location ?? null,
      mode: dto.mode,
      status: dto.status ?? 'draft',
      createdBy: actorId,
      updatedBy: actorId,
    });
    const saved = await this.offerings.save(offering);

    await this.generateSessions(saved.id, dto.startDate, course.totalSessions, actorId);
    return saved;
  }

  async update(id: string, dto: UpdateOfferingDto, actorId: string): Promise<CourseOffering> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');

    const nextStart = dto.startDate ?? offering.startDate;
    const nextEnd = dto.endDate ?? offering.endDate;
    this.ensureEndAfterStart(nextStart, nextEnd);

    if (dto.courseId !== undefined) offering.courseId = dto.courseId;
    if (dto.branchId !== undefined) offering.branchId = dto.branchId;
    if (dto.instructorId !== undefined) offering.instructorId = dto.instructorId ?? null;
    if (dto.startDate !== undefined) offering.startDate = dto.startDate;
    if (dto.endDate !== undefined) offering.endDate = dto.endDate;
    if (dto.capacity !== undefined) offering.capacity = dto.capacity ?? null;
    if (dto.location !== undefined) offering.location = dto.location ?? null;
    if (dto.mode !== undefined) offering.mode = dto.mode;
    if (dto.status !== undefined) offering.status = dto.status;
    offering.updatedBy = actorId;

    return this.offerings.save(offering);
  }

  async softDelete(id: string): Promise<void> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');
    await this.offerings.softDelete(id);
  }

  async listSessions(offeringId: string): Promise<CourseSession[]> {
    const offering = await this.offerings.findOne({ where: { id: offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');
    return this.sessions.find({ where: { offeringId }, order: { sessionNo: 'ASC' } });
  }

  private ensureEndAfterStart(startDate: string, endDate: string): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('End date must be on or after the start date.');
    }
  }

  private async generateSessions(offeringId: string, startDate: string, totalSessions: number, actorId: string): Promise<void> {
    const rows: CourseSession[] = [];
    const start = new Date(`${startDate}T00:00:00Z`);

    for (let i = 0; i < totalSessions; i++) {
      const sessionDate = new Date(start);
      sessionDate.setUTCDate(sessionDate.getUTCDate() + i * 7);

      rows.push(
        this.sessions.create({
          offeringId,
          sessionNo: i + 1,
          sessionDate: sessionDate.toISOString().slice(0, 10),
          startTime: DEFAULT_START_TIME,
          endTime: DEFAULT_END_TIME,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
    }

    await this.sessions.save(rows);
  }

  private async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  private async attachDetails(rows: CourseOffering[]): Promise<OfferingWithDetails[]> {
    if (rows.length === 0) return [];

    const courseIds = [...new Set(rows.map((r) => r.courseId))];
    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const instructorIds = [...new Set(rows.map((r) => r.instructorId).filter((id): id is string => !!id))];
    const offeringIds = rows.map((r) => r.id);

    const courseRows = await this.offerings.query(
      `SELECT id, title, total_sessions FROM courses WHERE id = ANY($1)`,
      [courseIds],
    );
    const branchRows = await this.offerings.query(`SELECT id, name FROM branches WHERE id = ANY($1)`, [branchIds]);
    const instructorRows = instructorIds.length
      ? await this.offerings.query(
          `SELECT id, first_name, last_name FROM users WHERE id = ANY($1)`,
          [instructorIds],
        )
      : [];
    const enrollCounts = await this.offerings.query(
      `SELECT offering_id, COUNT(*) AS count FROM course_enrollments WHERE offering_id = ANY($1) AND status IN ('enrolled','completed') GROUP BY offering_id`,
      [offeringIds],
    );

    const courseById = new Map<string, { title: string; total_sessions: number }>(
      courseRows.map((c: any) => [c.id, c]),
    );
    const branchNameById = new Map<string, string>(branchRows.map((b: any) => [b.id, b.name]));
    const instructorNameById = new Map<string, string>(
      instructorRows.map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]),
    );
    const enrollCountByOffering = new Map<string, number>(enrollCounts.map((e: any) => [e.offering_id, Number(e.count)]));

    return rows.map((row) => ({
      ...row,
      courseTitle: courseById.get(row.courseId)?.title ?? '—',
      totalSessions: courseById.get(row.courseId)?.total_sessions ?? 0,
      branchName: branchNameById.get(row.branchId) ?? '—',
      instructorName: row.instructorId ? instructorNameById.get(row.instructorId) ?? '—' : null,
      enrolledCount: enrollCountByOffering.get(row.id) ?? 0,
    }));
  }
}
