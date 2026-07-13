import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';

export interface CourseWithOfferingsCount extends Course {
  offeringsCount: number;
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
}

export interface PublicOffering {
  id: string;
  branchName: string;
  mode: 'online' | 'onsite';
  location: string | null;
  startDate: string;
  endDate: string;
  spotsLeft: number | null;
}

@Injectable()
export class CoursesService {
  constructor(@InjectRepository(Course) private readonly courses: Repository<Course>) {}

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
      category: dto.category ?? null,
      imageUrl: dto.image ?? null,
      totalSessions: dto.totalSessions,
      passingAttendancePercent: String(dto.passingAttendancePercent ?? 80),
      status: dto.status ?? 'active',
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.courses.save(course);
  }

  async update(id: string, dto: UpdateCourseDto, actorId: string): Promise<Course> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found.');

    if (dto.title !== undefined) course.title = dto.title;
    if (dto.description !== undefined) course.description = dto.description ?? null;
    if (dto.category !== undefined) course.category = dto.category ?? null;
    if (dto.image !== undefined) course.imageUrl = dto.image ?? null;
    if (dto.totalSessions !== undefined) course.totalSessions = dto.totalSessions;
    if (dto.passingAttendancePercent !== undefined) course.passingAttendancePercent = String(dto.passingAttendancePercent);
    if (dto.status !== undefined) course.status = dto.status;
    course.updatedBy = actorId;

    return this.courses.save(course);
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
    }));
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
        b.name AS branch_name,
        COALESCE(enrolled.count, 0) AS enrolled_count
      FROM course_offerings co
      JOIN branches b ON b.id = co.branch_id
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS count
        FROM course_enrollments
        WHERE status IN ('enrolled','completed')
        GROUP BY offering_id
      ) enrolled ON enrolled.offering_id = co.id
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
        branchName: r.branch_name,
        mode: r.mode,
        location: r.location,
        startDate: r.start_date,
        endDate: r.end_date,
        spotsLeft: r.capacity === null ? null : Number(r.capacity) - Number(r.enrolled_count),
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

    return rows.map((row) => ({ ...row, offeringsCount: countMap.get(row.id) ?? 0 }));
  }
}
