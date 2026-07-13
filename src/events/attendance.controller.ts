import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { AttendanceService } from './attendance.service';
import { AddAttendeeDto } from './dto/add-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';

@ApiTags('event-attendance')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('events/:eventId')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('attendees')
  @ApiOperation({ summary: 'List RSVP’d attendees for an event with their check-in status.' })
  listAttendees(@Param('eventId') eventId: string) {
    return this.attendance.listAttendees(eventId);
  }

  @Post('attendees')
  @ApiOperation({ summary: 'Add a user as an attendee. Auto-waitlists if the event is at capacity.' })
  addAttendee(@Param('eventId') eventId: string, @Body() dto: AddAttendeeDto) {
    return this.attendance.addAttendee(eventId, dto);
  }

  @Patch('attendees/:userId')
  @ApiOperation({ summary: 'Change an attendee’s RSVP status.' })
  updateAttendee(@Param('eventId') eventId: string, @Param('userId') userId: string, @Body() dto: UpdateAttendeeDto) {
    return this.attendance.updateAttendeeStatus(eventId, userId, dto.status);
  }

  @Delete('attendees/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user’s RSVP, check-in, and waitlist entry for this event.' })
  async removeAttendee(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    await this.attendance.removeAttendee(eventId, userId);
  }

  @Post('attendees/:userId/checkin')
  @ApiOperation({ summary: 'Toggle check-in for an attendee.' })
  toggleCheckin(@Param('eventId') eventId: string, @Param('userId') userId: string, @CurrentUser() actor: AuthUser) {
    return this.attendance.toggleCheckin(eventId, userId, actor.id);
  }

  @Get('checkin-qr')
  @ApiOperation({ summary: 'Get the venue check-in QR code for this event, for guests to scan themselves.' })
  getCheckinQr(@Param('eventId') eventId: string) {
    return this.attendance.getEventCheckinQr(eventId);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'List the waitlist for an event, ordered by position.' })
  listWaitlist(@Param('eventId') eventId: string) {
    return this.attendance.listWaitlist(eventId);
  }

  @Post('waitlist/promote')
  @ApiOperation({ summary: 'Promote the next waitlisted user to a confirmed RSVP.' })
  promote(@Param('eventId') eventId: string, @CurrentUser() actor: AuthUser) {
    return this.attendance.promoteFromWaitlist(eventId, actor.id);
  }
}
