import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';

@ApiTags('certificates')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'List issued certificates, optionally filtered by offering.' })
  findAll(@Query('offeringId') offeringId?: string) {
    return this.certificates.findAll(offeringId);
  }

  @Post()
  @ApiOperation({ summary: 'Issue a certificate to an eligible, enrolled student.' })
  issue(@Body() dto: IssueCertificateDto, @CurrentUser() actor: AuthUser) {
    return this.certificates.issue(dto, actor.id);
  }
}
