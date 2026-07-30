import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { StudentApplicationsService } from './student-applications.service';

@ApiTags('student-applications')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('student-applications')
export class StudentApplicationsController {
  constructor(private readonly applications: StudentApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List student applications, optionally filtered by status (pending/approved/rejected/all).' })
  findAll(@Query('status') status?: string) {
    return this.applications.findAll(status);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: "Approve an application — sets the applicant's role to student." })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.applications.approve(id, actor.id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an application.' })
  reject(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.applications.reject(id, actor.id);
  }
}
