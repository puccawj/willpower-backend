import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CoursesService } from './courses.service';
import { CourseNeedsService } from './course-needs.service';

@ApiTags('public-courses')
@Public()
@Controller('public/courses')
export class PublicCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly needs: CourseNeedsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active courses with enrollment availability for the public website.' })
  findAll() {
    return this.courses.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single active course, including its syllabus, for the public website.' })
  findOne(@Param('id') id: string) {
    return this.courses.findOnePublic(id);
  }

  @Get(':id/offerings')
  @ApiOperation({ summary: 'List open offerings for a course that a student can self-enroll into.' })
  findOfferings(@Param('id') id: string) {
    return this.courses.findPublicOfferings(id);
  }

  @Get(':id/needs')
  @ApiOperation({ summary: "List a course's donation wishlist items for the public website." })
  findNeeds(@Param('id') id: string) {
    return this.needs.findAllForCourse(id);
  }
}
