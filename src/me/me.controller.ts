import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { RegisterDeviceDto } from '../notifications/dto/register-device.dto';
import { AttendanceService } from '../events/attendance.service';
import { CreateRatingDto } from '../ratings/dto/create-rating.dto';
import { RatingsService } from '../ratings/ratings.service';
import { CreateStudentApplicationDto } from '../student-applications/dto/create-student-application.dto';
import { StudentApplicationsService } from '../student-applications/student-applications.service';
import { UpdateStudentApplicationDto } from '../student-applications/dto/update-student-application.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { SelfDonateDto } from './dto/self-donate.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { SetMyRsvpDto } from './dto/set-my-rsvp.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth('access-token')
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly ratings: RatingsService,
    private readonly attendance: AttendanceService,
    private readonly studentApplications: StudentApplicationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the current logged-in user profile.' })
  profile(@CurrentUser() actor: AuthUser) {
    return this.me.profile(actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my own name/nickname/phone.' })
  updateProfile(@Body() dto: UpdateMyProfileDto, @CurrentUser() actor: AuthUser) {
    return this.me.updateProfile(actor.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change my own password — only available for accounts created with email/password.' })
  async changePassword(@Body() dto: ChangeMyPasswordDto, @CurrentUser() actor: AuthUser) {
    await this.me.changePassword(actor.id, dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'List events the current user has RSVPd to.' })
  myEvents(@CurrentUser() actor: AuthUser) {
    return this.me.myEvents(actor.id);
  }

  @Put('events/:eventId/rsvp')
  @ApiOperation({ summary: 'Set my RSVP status for an event (confirm/maybe/cancel).' })
  async setRsvp(@Param('eventId') eventId: string, @Body() dto: SetMyRsvpDto, @CurrentUser() actor: AuthUser) {
    await this.me.setMyRsvp(actor.id, eventId, dto.status);
    return { ok: true };
  }

  @Post('events/:eventId/checkin')
  @ApiOperation({ summary: 'Check myself in to an event by scanning the venue QR code (requires a confirmed RSVP).' })
  selfCheckinEvent(@Param('eventId') eventId: string, @CurrentUser() actor: AuthUser) {
    return this.me.selfCheckinEvent(actor.id, eventId);
  }

  @Get('enrollments')
  @ApiOperation({ summary: "List the current user's course enrollments with attendance progress." })
  myEnrollments(@CurrentUser() actor: AuthUser) {
    return this.me.myEnrollments(actor.id);
  }

  @Post('enrollments')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: 'Self-enroll the current user into a course offering.' })
  @ApiForbiddenResponse({ description: 'Requires the student role.' })
  enrollSelf(@Body() dto: SelfEnrollDto, @CurrentUser() actor: AuthUser) {
    return this.me.enrollSelf(actor.id, dto.offeringId);
  }

  @Get('enrollments/:offeringId/sessions')
  @ApiOperation({ summary: 'List the class sessions for a course offering I am enrolled in, with my check-in status.' })
  mySessions(@Param('offeringId') offeringId: string, @CurrentUser() actor: AuthUser) {
    return this.me.mySessionsFor(actor.id, offeringId);
  }

  @Post('course-sessions/:sessionId/checkin')
  @ApiOperation({ summary: 'Check myself in to a course session by scanning the classroom QR code.' })
  selfCheckinSession(@Param('sessionId') sessionId: string, @CurrentUser() actor: AuthUser) {
    return this.me.selfCheckinSession(actor.id, sessionId);
  }

  @Get('events/:eventId/rating')
  @ApiOperation({ summary: 'Get my own rating for an event, if I have rated it.' })
  myEventRating(@Param('eventId') eventId: string, @CurrentUser() actor: AuthUser) {
    return this.ratings.myRating('event', eventId, actor.id);
  }

  @Put('events/:eventId/rating')
  @ApiOperation({
    summary:
      'Rate an event 1-5 stars, with an optional private note (admin-only, never shown publicly). Upserts. ' +
      'Only allowed after the event has ended, and only for attendees who checked in.',
  })
  async rateEvent(@Param('eventId') eventId: string, @Body() dto: CreateRatingDto, @CurrentUser() actor: AuthUser) {
    await this.attendance.assertCanRate(eventId, actor.id);
    return this.ratings.upsert('event', eventId, actor.id, dto);
  }

  @Get('course-offerings/:offeringId/rating')
  @ApiOperation({ summary: 'Get my own rating for a course offering, if I have rated it.' })
  myOfferingRating(@Param('offeringId') offeringId: string, @CurrentUser() actor: AuthUser) {
    return this.ratings.myRating('offering', offeringId, actor.id);
  }

  @Put('course-offerings/:offeringId/rating')
  @ApiOperation({ summary: 'Rate a course offering 1-5 stars, with an optional private note (admin-only, never shown publicly). Upserts.' })
  rateOffering(@Param('offeringId') offeringId: string, @Body() dto: CreateRatingDto, @CurrentUser() actor: AuthUser) {
    return this.ratings.upsert('offering', offeringId, actor.id, dto);
  }

  @Get('student-application')
  @ApiOperation({ summary: 'Get my most recent "become a student" application, if I have submitted one.' })
  myStudentApplication(@CurrentUser() actor: AuthUser) {
    return this.studentApplications.myLatest(actor.id);
  }

  @Post('student-application')
  @ApiOperation({ summary: 'Apply to become a student — requires an admin to approve before the role changes.' })
  submitStudentApplication(@Body() dto: CreateStudentApplicationDto, @CurrentUser() actor: AuthUser) {
    return this.studentApplications.submit(actor.id, dto);
  }

  @Patch('student-application')
  @ApiOperation({ summary: 'Edit my "become a student" application — only while it is still pending review.' })
  updateStudentApplication(@Body() dto: UpdateStudentApplicationDto, @CurrentUser() actor: AuthUser) {
    return this.studentApplications.update(actor.id, dto);
  }

  @Get('certificates')
  @ApiOperation({ summary: "List the current user's issued certificates." })
  myCertificates(@CurrentUser() actor: AuthUser) {
    return this.me.myCertificates(actor.id);
  }

  @Get('donations')
  @ApiOperation({ summary: "List the current user's donations." })
  myDonations(@CurrentUser() actor: AuthUser) {
    return this.me.myDonations(actor.id);
  }

  @Post('donations')
  @ApiOperation({ summary: 'Make a donation as the current logged-in user.' })
  donateSelf(@Body() dto: SelfDonateDto, @CurrentUser() actor: AuthUser) {
    return this.me.donateSelf(actor.id, dto);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register this device/browser for push notifications (upserts on user + push token).' })
  async registerDevice(@Body() dto: RegisterDeviceDto, @CurrentUser() actor: AuthUser) {
    await this.me.registerDevice(actor.id, dto);
    return { ok: true };
  }

  @Delete('devices/:pushToken')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device (e.g. on logout) so it stops receiving push notifications.' })
  async unregisterDevice(@Param('pushToken') pushToken: string, @CurrentUser() actor: AuthUser) {
    await this.me.unregisterDevice(actor.id, pushToken);
  }

  @Get('notifications')
  @ApiOperation({ summary: "List the current user's notifications, newest first." })
  myNotifications(@CurrentUser() actor: AuthUser) {
    return this.me.myNotifications(actor.id);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: "Count the current user's unread notifications." })
  async myUnreadNotificationCount(@CurrentUser() actor: AuthUser) {
    return { count: await this.me.myUnreadNotificationCount(actor.id) };
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark one notification as read.' })
  async markNotificationRead(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.me.markNotificationRead(actor.id, id);
  }

  @Post('notifications/mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification for the current user as read.' })
  async markAllNotificationsRead(@CurrentUser() actor: AuthUser) {
    await this.me.markAllNotificationsRead(actor.id);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one notification for the current user.' })
  async deleteNotification(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.me.deleteNotification(actor.id, id);
  }
}
