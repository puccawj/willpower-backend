import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { SelfDonateDto } from './dto/self-donate.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { SetMyRsvpDto } from './dto/set-my-rsvp.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth('access-token')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current logged-in user profile.' })
  profile(@CurrentUser() actor: AuthUser) {
    return this.me.profile(actor.id);
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
}
