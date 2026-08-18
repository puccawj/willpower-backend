import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';

@Injectable()
export class CourseCategoriesService {
  constructor(@InjectRepository(CourseCategory) private readonly categories: Repository<CourseCategory>) {}

  findAll(): Promise<CourseCategory[]> {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  findAllPublic(): Promise<CourseCategory[]> {
    return this.categories.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  async create(dto: CreateCourseCategoryDto): Promise<CourseCategory> {
    await this.ensureNameIsUnique(dto.name);
    const category = this.categories.create({ name: dto.name, active: dto.active ?? true });
    return this.categories.save(category);
  }

  async update(id: string, dto: UpdateCourseCategoryDto): Promise<CourseCategory> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Course category not found.');

    if (dto.name !== undefined && dto.name.trim().toLowerCase() !== category.name.trim().toLowerCase()) {
      await this.ensureNameIsUnique(dto.name, id);
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.active !== undefined) category.active = dto.active;

    return this.categories.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Course category not found.');

    const [{ count }] = await this.categories.query('SELECT COUNT(*) FROM courses WHERE category_id = $1', [id]);
    if (Number(count) > 0) {
      throw new ConflictException(`This category cannot be deleted because it is still used by ${count} course(s).`);
    }

    await this.categories.delete(id);
  }

  private async ensureNameIsUnique(name: string, excludeId?: string): Promise<void> {
    const query = this.categories.createQueryBuilder('c').where('LOWER(c.name) = LOWER(:name)', { name: name.trim() });
    if (excludeId) query.andWhere('c.id != :excludeId', { excludeId });

    const existing = await query.getOne();
    if (existing) throw new ConflictException('A category with this name already exists.');
  }
}
