import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { EnrollDto } from './dto/enroll.dto';
import { EnrollmentService } from './enrollment.service';

@ApiTags('course-enrollment')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin, admin, or instructor role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin', 'instructor')
@Controller('course-offerings/:offeringId')
export class EnrollmentController {
  constructor(private readonly enrollment: EnrollmentService) {}

  @Get('enrollments')
  @ApiOperation({ summary: 'List enrolled students with cumulative attendance %, optionally flagged for a specific session.' })
  listEnrollments(@Param('offeringId') offeringId: string, @Query('sessionId') sessionId?: string) {
    return this.enrollment.listEnrollments(offeringId, sessionId);
  }

  @Post('enrollments')
  @ApiOperation({ summary: 'Enroll a student in this offering.' })
  enroll(@Param('offeringId') offeringId: string, @Body() dto: EnrollDto) {
    return this.enrollment.enroll(offeringId, dto);
  }

  @Delete('enrollments/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a student from this offering.' })
  async removeEnrollment(@Param('offeringId') offeringId: string, @Param('userId') userId: string) {
    await this.enrollment.removeEnrollment(offeringId, userId);
  }

  @Get('sessions/:sessionId/checkin-qr')
  @ApiOperation({ summary: 'Get the classroom check-in QR code for this session, for students to scan themselves.' })
  getSessionCheckinQr(@Param('sessionId') sessionId: string) {
    return this.enrollment.getSessionCheckinQr(sessionId);
  }

  @Post('sessions/:sessionId/attendance/:userId')
  @ApiOperation({ summary: 'Toggle a student\'s check-in for a specific session.' })
  toggleAttendance(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.enrollment.toggleAttendance(sessionId, userId, actor.id);
  }
}
