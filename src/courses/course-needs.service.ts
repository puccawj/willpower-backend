import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseNeed } from './entities/course-need.entity';
import { CreateCourseNeedDto } from './dto/create-course-need.dto';
import { UpdateCourseNeedDto } from './dto/update-course-need.dto';

@Injectable()
export class CourseNeedsService {
  constructor(
    @InjectRepository(CourseNeed) private readonly needs: Repository<CourseNeed>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
  ) {}

  async findAllForCourse(courseId: string): Promise<CourseNeed[]> {
    await this.getCourseOrThrow(courseId);
    return this.needs.find({ where: { courseId }, order: { sessionNumber: 'ASC', createdAt: 'ASC' } });
  }

  async create(courseId: string, dto: CreateCourseNeedDto, actorId: string): Promise<CourseNeed> {
    await this.getCourseOrThrow(courseId);
    const need = this.needs.create({
      courseId,
      sessionNumber: dto.sessionNumber ?? null,
      title: dto.title,
      type: dto.type,
      unit: dto.unit ?? null,
      targetQuantity: dto.targetQuantity.toFixed(2),
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.needs.save(need);
  }

  async update(courseId: string, id: string, dto: UpdateCourseNeedDto, actorId: string): Promise<CourseNeed> {
    const need = await this.getOrThrow(courseId, id);

    if (dto.title !== undefined) need.title = dto.title;
    if (dto.sessionNumber !== undefined) need.sessionNumber = dto.sessionNumber ?? null;
    if (dto.type !== undefined) need.type = dto.type;
    if (dto.unit !== undefined) need.unit = dto.unit ?? null;
    if (dto.targetQuantity !== undefined) need.targetQuantity = dto.targetQuantity.toFixed(2);
    need.updatedBy = actorId;

    return this.needs.save(need);
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.getOrThrow(courseId, id);
    await this.needs.softDelete(id);
  }

  async incrementReceived(needId: string, addedQuantity: number): Promise<void> {
    if (!addedQuantity) return;
    await this.needs.query(
      `UPDATE course_needs SET received_quantity = received_quantity + $2 WHERE id = $1`,
      [needId, addedQuantity],
    );
  }

  private async getOrThrow(courseId: string, id: string): Promise<CourseNeed> {
    const need = await this.needs.findOne({ where: { id, courseId } });
    if (!need) throw new NotFoundException('Need not found.');
    return need;
  }

  private async getCourseOrThrow(courseId: string): Promise<Course> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found.');
    return course;
  }
}
