import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CoursesService } from './courses.service';

@ApiTags('public-courses')
@Public()
@Controller('public/courses')
export class PublicCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List active courses with enrollment availability for the public website.' })
  findAll() {
    return this.courses.findAllPublic();
  }

  @Get(':id/offerings')
  @ApiOperation({ summary: 'List open offerings for a course that a student can self-enroll into.' })
  findOfferings(@Param('id') id: string) {
    return this.courses.findPublicOfferings(id);
  }
}
