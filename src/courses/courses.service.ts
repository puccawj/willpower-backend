import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';
import { CoursePrerequisite } from './entities/course-prerequisite.entity';

export interface CourseWithOfferingsCount extends Course {
  offeringsCount: number;
  prerequisiteCourseIds: string[];
}

export interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  totalSessions: number;
  passingAttendancePercent: number;
  offeringsCount: number;
  modes: ('online' | 'onsite')[];
  isOpenForEnrollment: boolean;
  prerequisiteTitles: string[];
}

export interface PublicCourseDetail extends PublicCourse {
  syllabus: string | null;
}

export interface PublicOfferingScheduleSlot {
  dow: number;
  startTime: string;
  endTime: string;
}

export interface PublicOffering {
  id: string;
  branchId: string;
  branchName: string;
  mode: 'online' | 'onsite';
  location: string | null;
  startDate: string;
  endDate: string;
  spotsLeft: number | null;
  scheduleSummary: PublicOfferingScheduleSlot[];
}

export interface PublicCourseOfferingCard {
  courseId: string;
  offeringId: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  branchId: string;
  branchName: string;
  mode: 'online' | 'onsite';
  startDate: string;
  endDate: string;
  spotsLeft: number | null;
  scheduleSummary: PublicOfferingScheduleSlot[];
  prerequisiteTitles: string[];
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CoursePrerequisite) private readonly prerequisites: Repository<CoursePrerequisite>,
  ) {}

  async findAll(): Promise<CourseWithOfferingsCount[]> {
    const rows = await this.courses.find({ order: { title: 'ASC' } });
    return this.attachOfferingsCount(rows);
  }

  async findOne(id: string): Promise<CourseWithOfferingsCount> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found.');
    const [withCount] = await this.attachOfferingsCount([course]);
    return withCount;
  }

  async create(dto: CreateCourseDto, actorId: string): Promise<Course> {
    const course = this.courses.create({
      title: dto.title,
      description: dto.description ?? null,
      syllabus: dto.syllabus ?? null,
      category: dto.category ?? null,
      imageUrl: dto.image ?? null,
      totalSessions: dto.totalSessions,
      passingAttendancePercent: String(dto.passingAttendancePercent ?? 80),
      status: dto.status ?? 'active',
      createdBy: actorId,
      updatedBy: actorId,
    });
    const saved = await this.courses.save(course);
    if (dto.prerequisiteCourseIds !== undefined) {
      await this.setPrerequisites(saved.id, dto.prerequisiteCourseIds);
    }
    return saved;
  }

  async update(id: string, dto: UpdateCourseDto, actorId: string): Promise<Course> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found.');

    if (dto.title !== undefined) course.title = dto.title;
    if (dto.description !== undefined) course.description = dto.description ?? null;
    if (dto.syllabus !== undefined) course.syllabus = dto.syllabus ?? null;
    if (dto.category !== undefined) course.category = dto.category ?? null;
    if (dto.image !== undefined) course.imageUrl = dto.image ?? null;
    if (dto.totalSessions !== undefined) course.totalSessions = dto.totalSessions;
    if (dto.passingAttendancePercent !== undefined) course.passingAttendancePercent = String(dto.passingAttendancePercent);
    if (dto.status !== undefined) course.status = dto.status;
    course.updatedBy = actorId;

    const saved = await this.courses.save(course);
    if (dto.prerequisiteCourseIds !== undefined) {
      await this.setPrerequisites(id, dto.prerequisiteCourseIds);
    }
    return saved;
  }

  /** Replaces a course's full prerequisite set. A course can never be its own prerequisite. */
  private async setPrerequisites(courseId: string, prerequisiteCourseIds: string[]): Promise<void> {
    const ids = [...new Set(prerequisiteCourseIds)].filter((id) => id !== courseId);
    if (ids.length) {
      const found = await this.courses.find({ where: ids.map((id) => ({ id })) });
      if (found.length !== ids.length) throw new BadRequestException('One or more prerequisite courses were not found.');
    }

    await this.prerequisites.delete({ courseId });
    if (ids.length) {
      await this.prerequisites.save(ids.map((prerequisiteCourseId) => this.prerequisites.create({ courseId, prerequisiteCourseId })));
    }
  }

  async prerequisiteIdsFor(courseId: string): Promise<string[]> {
    const rows = await this.prerequisites.find({ where: { courseId } });
    return rows.map((r) => r.prerequisiteCourseId);
  }

  async softDelete(id: string): Promise<void> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found.');
    await this.courses.softDelete(id);
  }

  async findAllPublic(): Promise<PublicCourse[]> {
    const courses = await this.courses.find({ where: { status: 'active' }, order: { title: 'ASC' } });
    if (courses.length === 0) return [];

    const ids = courses.map((c) => c.id);
    const offeringRows = await this.courses.query(
      `
      SELECT
        co.course_id,
        co.mode,
        co.status,
        co.end_date::text AS end_date,
        co.capacity,
        COALESCE(enrolled.count, 0) AS enrolled_count
      FROM course_offerings co
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS count
        FROM course_enrollments
        WHERE status IN ('enrolled','completed')
        GROUP BY offering_id
      ) enrolled ON enrolled.offering_id = co.id
      WHERE co.course_id = ANY($1) AND co.deleted_at IS NULL
      `,
      [ids],
    );

    const offeringsCountById = new Map<string, number>();
    const modesById = new Map<string, Set<string>>();
    const openById = new Map<string, boolean>();
    const today = new Date().toISOString().slice(0, 10);

    for (const row of offeringRows) {
      offeringsCountById.set(row.course_id, (offeringsCountById.get(row.course_id) ?? 0) + 1);
      if (!modesById.has(row.course_id)) modesById.set(row.course_id, new Set());
      modesById.get(row.course_id)!.add(row.mode);

      const isOpen =
        ['scheduled', 'ongoing'].includes(row.status) &&
        row.end_date >= today &&
        (row.capacity === null || Number(row.capacity) > Number(row.enrolled_count));
      if (isOpen) openById.set(row.course_id, true);
    }

    const prereqTitlesById = await this.prerequisiteTitlesFor(ids);

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      imageUrl: c.imageUrl,
      totalSessions: c.totalSessions,
      passingAttendancePercent: Number(c.passingAttendancePercent),
      offeringsCount: offeringsCountById.get(c.id) ?? 0,
      modes: [...(modesById.get(c.id) ?? [])] as ('online' | 'onsite')[],
      isOpenForEnrollment: openById.get(c.id) ?? false,
      prerequisiteTitles: prereqTitlesById.get(c.id) ?? [],
    }));
  }

  /** Bulk-fetches human-readable prerequisite course titles for a set of courses. */
  private async prerequisiteTitlesFor(courseIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!courseIds.length) return map;
    const rows = await this.courses.query(
      `SELECT cp.course_id, c.title
       FROM course_prerequisites cp
       JOIN courses c ON c.id = cp.prerequisite_course_id
       WHERE cp.course_id = ANY($1)`,
      [courseIds],
    );
    for (const row of rows) {
      const list = map.get(row.course_id) ?? [];
      list.push(row.title);
      map.set(row.course_id, list);
    }
    return map;
  }

  async findOnePublic(id: string): Promise<PublicCourseDetail> {
    const course = await this.courses.findOne({ where: { id, status: 'active' } });
    if (!course) throw new NotFoundException('Course not found.');

    const offeringRows = await this.courses.query(
      `
      SELECT
        co.mode,
        co.status,
        co.end_date::text AS end_date,
        co.capacity,
        COALESCE(enrolled.count, 0) AS enrolled_count
      FROM course_offerings co
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS count
        FROM course_enrollments
        WHERE status IN ('enrolled','completed')
        GROUP BY offering_id
      ) enrolled ON enrolled.offering_id = co.id
      WHERE co.course_id = $1 AND co.deleted_at IS NULL
      `,
      [id],
    );

    const today = new Date().toISOString().slice(0, 10);
    const modes = new Set<string>();
    let isOpenForEnrollment = false;
    for (const row of offeringRows) {
      modes.add(row.mode);
      const isOpen =
        ['scheduled', 'ongoing'].includes(row.status) &&
        row.end_date >= today &&
        (row.capacity === null || Number(row.capacity) > Number(row.enrolled_count));
      if (isOpen) isOpenForEnrollment = true;
    }

    const prereqTitlesById = await this.prerequisiteTitlesFor([id]);

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      syllabus: course.syllabus,
      category: course.category,
      imageUrl: course.imageUrl,
      totalSessions: course.totalSessions,
      passingAttendancePercent: Number(course.passingAttendancePercent),
      offeringsCount: offeringRows.length,
      modes: [...modes] as ('online' | 'onsite')[],
      isOpenForEnrollment,
      prerequisiteTitles: prereqTitlesById.get(id) ?? [],
    };
  }

  async findPublicOfferings(courseId: string): Promise<PublicOffering[]> {
    const course = await this.courses.findOne({ where: { id: courseId, status: 'active' } });
    if (!course) throw new NotFoundException('Course not found.');

    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.courses.query(
      `
      SELECT
        co.id,
        co.mode,
        co.location,
        co.start_date::text AS start_date,
        co.end_date::text AS end_date,
        co.capacity,
        co.branch_id,
        b.name AS branch_name,
        COALESCE(enrolled.count, 0) AS enrolled_count,
        COALESCE(sched.schedule, '[]') AS schedule
      FROM course_offerings co
      JOIN branches b ON b.id = co.branch_id
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS count
        FROM course_enrollments
        WHERE status IN ('enrolled','completed')
        GROUP BY offering_id
      ) enrolled ON enrolled.offering_id = co.id
      LEFT JOIN (
        SELECT offering_id,
               json_agg(DISTINCT jsonb_build_object(
                 'dow', extract(dow from session_date)::int,
                 'startTime', start_time::text,
                 'endTime', end_time::text
               )) AS schedule
        FROM course_sessions
        GROUP BY offering_id
      ) sched ON sched.offering_id = co.id
      WHERE co.course_id = $1 AND co.deleted_at IS NULL
        AND co.status IN ('scheduled','ongoing') AND co.end_date >= $2
      ORDER BY co.start_date ASC
      `,
      [courseId, today],
    );

    return rows
      .filter((r: any) => r.capacity === null || Number(r.capacity) > Number(r.enrolled_count))
      .map((r: any) => ({
        id: r.id,
        branchId: r.branch_id,
        branchName: r.branch_name,
        mode: r.mode,
        location: r.location,
        startDate: r.start_date,
        endDate: r.end_date,
        spotsLeft: r.capacity === null ? null : Number(r.capacity) - Number(r.enrolled_count),
        scheduleSummary: typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule,
      }));
  }

  /** One row per open offering across all active courses, each carrying its parent course's display fields. */
  async findAllPublicOfferings(): Promise<PublicCourseOfferingCard[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.courses.query(
      `
      SELECT
        c.id AS course_id,
        c.title,
        c.category,
        c.image_url,
        co.id AS offering_id,
        co.mode,
        co.start_date::text AS start_date,
        co.end_date::text AS end_date,
        co.capacity,
        co.branch_id,
        b.name AS branch_name,
        COALESCE(enrolled.count, 0) AS enrolled_count,
        COALESCE(sched.schedule, '[]') AS schedule
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id AND c.status = 'active'
      JOIN branches b ON b.id = co.branch_id
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS count
        FROM course_enrollments
        WHERE status IN ('enrolled','completed')
        GROUP BY offering_id
      ) enrolled ON enrolled.offering_id = co.id
      LEFT JOIN (
        SELECT offering_id,
               json_agg(DISTINCT jsonb_build_object(
                 'dow', extract(dow from session_date)::int,
                 'startTime', start_time::text,
                 'endTime', end_time::text
               )) AS schedule
        FROM course_sessions
        GROUP BY offering_id
      ) sched ON sched.offering_id = co.id
      WHERE co.deleted_at IS NULL
        AND co.status IN ('scheduled','ongoing') AND co.end_date >= $1
      ORDER BY co.start_date ASC
      `,
      [today],
    );

    const open = rows.filter((r: any) => r.capacity === null || Number(r.capacity) > Number(r.enrolled_count));
    const courseIds: string[] = Array.from(new Set(open.map((r: any) => r.course_id)));
    const prereqTitlesById = await this.prerequisiteTitlesFor(courseIds);

    return open
      .map((r: any) => ({
        courseId: r.course_id,
        offeringId: r.offering_id,
        title: r.title,
        category: r.category,
        imageUrl: r.image_url,
        branchId: r.branch_id,
        branchName: r.branch_name,
        mode: r.mode,
        startDate: r.start_date,
        endDate: r.end_date,
        spotsLeft: r.capacity === null ? null : Number(r.capacity) - Number(r.enrolled_count),
        scheduleSummary: typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule,
        prerequisiteTitles: prereqTitlesById.get(r.course_id) ?? [],
      }));
  }

  private async attachOfferingsCount(rows: Course[]): Promise<CourseWithOfferingsCount[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const counts = await this.courses.query(
      `SELECT course_id, COUNT(*) AS count FROM course_offerings WHERE course_id = ANY($1) AND deleted_at IS NULL GROUP BY course_id`,
      [ids],
    );
    const countMap = new Map<string, number>(counts.map((c: any) => [c.course_id, Number(c.count)]));

    const prereqRows = await this.prerequisites.find({ where: ids.map((id) => ({ courseId: id })) });
    const prereqMap = new Map<string, string[]>();
    for (const row of prereqRows) {
      const list = prereqMap.get(row.courseId) ?? [];
      list.push(row.prerequisiteCourseId);
      prereqMap.set(row.courseId, list);
    }

    return rows.map((row) => ({
      ...row,
      offeringsCount: countMap.get(row.id) ?? 0,
      prerequisiteCourseIds: prereqMap.get(row.id) ?? [],
    }));
  }
}
