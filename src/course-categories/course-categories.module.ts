import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { CourseCategoriesController } from './course-categories.controller';
import { PublicCourseCategoriesController } from './public-course-categories.controller';
import { CourseCategoriesService } from './course-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseCategory])],
  controllers: [CourseCategoriesController, PublicCourseCategoriesController],
  providers: [CourseCategoriesService],
})
export class CourseCategoriesModule {}
