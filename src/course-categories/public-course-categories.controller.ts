import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CourseCategoriesService } from './course-categories.service';

@ApiTags('public-course-categories')
@Public()
@Controller('public/course-categories')
export class PublicCourseCategoriesController {
  constructor(private readonly categories: CourseCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active course categories for the public website.' })
  findAll() {
    return this.categories.findAllPublic();
  }
}
