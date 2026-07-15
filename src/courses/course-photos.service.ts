import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CoursePhoto } from './entities/course-photo.entity';
import { CreateCoursePhotoDto } from './dto/create-course-photo.dto';
import { UpdateCoursePhotoDto } from './dto/update-course-photo.dto';

@Injectable()
export class CoursePhotosService {
  constructor(
    @InjectRepository(CoursePhoto) private readonly photos: Repository<CoursePhoto>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
  ) {}

  async findAllForCourse(courseId: string): Promise<CoursePhoto[]> {
    await this.getCourseOrThrow(courseId);
    return this.photos.find({ where: { courseId, status: 'approved' }, order: { createdAt: 'DESC' } });
  }

  async create(courseId: string, dto: CreateCoursePhotoDto, actorId: string): Promise<CoursePhoto> {
    await this.getCourseOrThrow(courseId);
    const photo = this.photos.create({
      courseId,
      userId: actorId,
      imageUrl: dto.imageUrl,
      caption: dto.caption ?? null,
      status: 'approved',
      moderatedBy: actorId,
      moderatedAt: new Date(),
    });
    return this.photos.save(photo);
  }

  async update(courseId: string, id: string, dto: UpdateCoursePhotoDto): Promise<CoursePhoto> {
    const photo = await this.getOrThrow(courseId, id);
    if (dto.imageUrl !== undefined) photo.imageUrl = dto.imageUrl;
    if (dto.caption !== undefined) photo.caption = dto.caption ?? null;
    return this.photos.save(photo);
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.getOrThrow(courseId, id);
    await this.photos.delete(id);
  }

  private async getOrThrow(courseId: string, id: string): Promise<CoursePhoto> {
    const photo = await this.photos.findOne({ where: { id, courseId } });
    if (!photo) throw new NotFoundException('Photo not found.');
    return photo;
  }

  private async getCourseOrThrow(courseId: string): Promise<Course> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found.');
    return course;
  }
}
