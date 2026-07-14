import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService } from './donations.service';

@ApiTags('public-donations')
@Public()
@Controller('public')
export class PublicDonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get('events/:eventId/donations')
  @ApiOperation({ summary: 'List approved (verified) donations for an event, for the public website.' })
  findForEvent(@Param('eventId') eventId: string) {
    return this.donations.publicListForEvent(eventId);
  }

  @Get('courses/:courseId/donations')
  @ApiOperation({ summary: 'List approved (verified) donations for a course, for the public website.' })
  findForCourse(@Param('courseId') courseId: string) {
    return this.donations.publicListForCourse(courseId);
  }
}
