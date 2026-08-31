import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('learning-summary')
  @ApiOperation({ summary: 'Cross-offering learning aggregates: active offerings, avg completion %, at-risk students.' })
  learningSummary(@CurrentUser() actor: AuthUser) {
    return this.reports.learningSummary(actor);
  }
}
