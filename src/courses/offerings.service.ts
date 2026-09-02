import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseOffering } from './entities/course-offering.entity';
import { Course } from './entities/course.entity';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EnrollmentService } from './enrollment.service';

export interface OfferingWithDetails extends CourseOffering {
  courseTitle: string;
  courseStatus: 'active' | 'inactive';
  totalSessions: number;
  branchName: string;
  instructorName: string | null;
  enrolledCount: number;
}

@Injectable()
export class OfferingsService implements OnModuleInit {
  private readonly logger = new Logger(OfferingsService.name);

  constructor(
    @InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseSession) private readonly sessions: Repository<CourseSession>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  /**
   * Auto-transitions `published` offerings to `completed` once their end date has passed —
   * previously this only ever happened if an admin manually changed the dropdown. `draft` and
   * `cancelled` are left alone; only a genuinely-running offering "ends" on its own.
   * Runs hourly, which is plenty for a date-only comparison, and also once at boot so a
   * long-stopped dev/staging instance catches up immediately instead of waiting for the next tick.
   */
  onModuleInit(): void {
    this.autoCompleteExpiredOfferings().catch((err) => this.logger.error('Startup offering auto-complete sweep failed', err));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteExpiredOfferings(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.offerings.update({ status: 'published', endDate: LessThan(today) }, { status: 'completed' });
    if (result.affected) {
      this.logger.log(`Auto-completed ${result.affected} offering(s) past their end date.`);
    }

    // Safety-net sweep: catches a student who already crossed the passing bar but hasn't
    // checked in again since (the primary trigger), and ended offerings' stragglers who need
    // 'failed' recorded — otherwise either case can stay stuck at 'enrolled' indefinitely,
    // incorrectly failing the prerequisite check for later courses.
    const finalized = await this.enrollmentService.finalizeAllEligibleEnrollments();
    if (finalized) {
      this.logger.log(`Re-checked completion status for ${finalized} 'enrolled' row(s).`);
    }
  }

  async findAll(actor: AuthUser): Promise<OfferingWithDetails[]> {
    const rows = await this.offerings.find({ order: { startDate: 'ASC' } });
    const withDetails = await this.attachDetails(rows);

    if (actor.role === 'superadmin') return withDetails;
    // Instructors only see the offerings they personally teach — everyone else assigned to the
    // same branch (other instructors' classes, walk-in offerings with no instructor set) isn't
    // theirs to view. Admins keep the wider branch-level view since they manage the whole branch.
    if (actor.role === 'instructor') return withDetails.filter((o) => o.instructorId === actor.id);

    const actorBranchIds = await this.branchIdsOf(actor.id);
    return withDetails.filter((o) => actorBranchIds.has(o.branchId));
  }

  async findOne(id: string, actor: AuthUser): Promise<OfferingWithDetails> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');

    if (actor.role === 'instructor') {
      if (offering.instructorId !== actor.id) throw new NotFoundException('Offering not found.');
    } else if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
    }

    const [withDetails] = await this.attachDetails([offering]);
    return withDetails;
  }

  async create(dto: CreateOfferingDto, actor: AuthUser): Promise<CourseOffering> {
    this.ensureEndAfterStart(dto.startDate, dto.endDate);

    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException('Course not found.');

    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(dto.branchId)) {
        throw new ForbiddenException('You can only create offerings for your own branch.');
      }
    }

    const offering = this.offerings.create({
      courseId: dto.courseId,
      branchId: dto.branchId,
      code: dto.code?.trim() || null,
      instructorId: dto.instructorId ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      capacity: dto.capacity ?? null,
      location: dto.location ?? null,
      mode: dto.mode,
      status: dto.status ?? 'draft',
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    // Sessions are no longer auto-generated on a fixed cadence — the admin builds the
    // Sessions list by hand afterward (add/edit/remove), since real class schedules rarely
    // land on a neat weekly interval.
    return this.offerings.save(offering);
  }

  async update(id: string, dto: UpdateOfferingDto, actor: AuthUser): Promise<CourseOffering> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');
    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
      if (dto.branchId !== undefined && !actorBranchIds.has(dto.branchId)) {
        throw new ForbiddenException('You can only move offerings to your own branch.');
      }
    }

    const nextStart = dto.startDate ?? offering.startDate;
    const nextEnd = dto.endDate ?? offering.endDate;
    this.ensureEndAfterStart(nextStart, nextEnd);

    if (dto.status === 'published') {
      const nextCourseId = dto.courseId ?? offering.courseId;
      const course = await this.courses.findOne({ where: { id: nextCourseId } });
      const sessionCount = await this.sessions.count({ where: { offeringId: id } });
      if (!course || sessionCount !== course.totalSessions) {
        throw new BadRequestException(
          `Cannot publish — this offering has ${sessionCount} of the ${course?.totalSessions ?? 0} session(s) the course calls for. Build the full schedule in the Sessions tab first.`,
        );
      }
    }

    if (dto.courseId !== undefined) offering.courseId = dto.courseId;
    if (dto.branchId !== undefined) offering.branchId = dto.branchId;
    if (dto.code !== undefined) offering.code = dto.code?.trim() || null;
    if (dto.instructorId !== undefined) offering.instructorId = dto.instructorId ?? null;
    if (dto.startDate !== undefined) offering.startDate = dto.startDate;
    if (dto.endDate !== undefined) offering.endDate = dto.endDate;
    if (dto.capacity !== undefined) offering.capacity = dto.capacity ?? null;
    if (dto.location !== undefined) offering.location = dto.location ?? null;
    if (dto.mode !== undefined) offering.mode = dto.mode;
    if (dto.status !== undefined) offering.status = dto.status;
    offering.updatedBy = actor.id;

    return this.offerings.save(offering);
  }

  async softDelete(id: string, actor: AuthUser): Promise<void> {
    const offering = await this.offerings.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found.');
    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
    }
    await this.offerings.softDelete(id);
  }

  async listSessions(offeringId: string, actor: AuthUser): Promise<CourseSession[]> {
    const offering = await this.offerings.findOne({ where: { id: offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');
    if (actor.role === 'instructor') {
      if (offering.instructorId !== actor.id) throw new NotFoundException('Offering not found.');
    } else if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
    }
    return this.sessions.find({ where: { offeringId }, order: { sessionNo: 'ASC' } });
  }

  async addSession(offeringId: string, dto: CreateSessionDto, actor: AuthUser): Promise<CourseSession> {
    const offering = await this.assertOfferingAccess(offeringId, actor);

    const course = await this.courses.findOne({ where: { id: offering.courseId } });
    const currentCount = await this.sessions.count({ where: { offeringId } });
    if (course && currentCount >= course.totalSessions) {
      throw new BadRequestException(
        `This offering already has all ${course.totalSessions} session(s) the course calls for — remove one before adding another, or update the course's Total Sessions.`,
      );
    }

    let sessionNo = dto.sessionNo;
    if (sessionNo === undefined) {
      const raw = await this.sessions
        .createQueryBuilder('s')
        .select('MAX(s.session_no)', 'max')
        .where('s.offering_id = :offeringId', { offeringId })
        .getRawOne<{ max: number | null }>();
      sessionNo = (raw?.max ?? 0) + 1;
    }

    const session = this.sessions.create({
      offeringId,
      sessionNo,
      sessionDate: dto.sessionDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      topic: dto.topic ?? null,
      location: dto.location ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return this.sessions.save(session);
  }

  async updateSession(offeringId: string, sessionId: string, dto: UpdateSessionDto, actor: AuthUser): Promise<CourseSession> {
    await this.assertOfferingAccess(offeringId, actor);
    const session = await this.sessions.findOne({ where: { id: sessionId, offeringId } });
    if (!session) throw new NotFoundException('Session not found.');

    if (dto.sessionDate !== undefined) session.sessionDate = dto.sessionDate;
    if (dto.startTime !== undefined) session.startTime = dto.startTime;
    if (dto.endTime !== undefined) session.endTime = dto.endTime;
    if (dto.topic !== undefined) session.topic = dto.topic ?? null;
    if (dto.location !== undefined) session.location = dto.location ?? null;
    if (dto.sessionNo !== undefined) session.sessionNo = dto.sessionNo;
    session.updatedBy = actor.id;

    return this.sessions.save(session);
  }

  async removeSession(offeringId: string, sessionId: string, actor: AuthUser): Promise<void> {
    const offering = await this.assertOfferingAccess(offeringId, actor);
    const session = await this.sessions.findOne({ where: { id: sessionId, offeringId } });
    if (!session) throw new NotFoundException('Session not found.');
    // A published offering's session count must keep matching the course's totalSessions (see
    // the same check in `update()`) — removing one here would silently break that invariant and
    // throw off every enrolled student's attendance %, since that's computed against totalSessions.
    if (offering.status === 'published') {
      throw new BadRequestException('Cannot remove a session from a published offering — set it back to Draft first.');
    }
    // Deleting a session also drops any attendance recorded against it — acceptable for the
    // holiday/reschedule/mis-entry cases this is meant for; renumbering the rest is intentionally
    // left alone so a removed session doesn't shuffle every later session's number.
    await this.sessions.delete({ id: sessionId, offeringId });
  }

  private async assertOfferingAccess(offeringId: string, actor: AuthUser): Promise<CourseOffering> {
    const offering = await this.offerings.findOne({ where: { id: offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');
    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(offering.branchId)) throw new NotFoundException('Offering not found.');
    }
    return offering;
  }

  private ensureEndAfterStart(startDate: string, endDate: string): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('End date must be on or after the start date.');
    }
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
      `SELECT id, title, total_sessions, status FROM courses WHERE id = ANY($1)`,
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

    const courseById = new Map<string, { title: string; total_sessions: number; status: 'active' | 'inactive' }>(
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
      courseStatus: courseById.get(row.courseId)?.status ?? 'active',
      totalSessions: courseById.get(row.courseId)?.total_sessions ?? 0,
      branchName: branchNameById.get(row.branchId) ?? '—',
      instructorName: row.instructorId ? instructorNameById.get(row.instructorId) ?? '—' : null,
      enrolledCount: enrollCountByOffering.get(row.id) ?? 0,
    }));
  }
}
