import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { RegistryService } from './registry.service';

@ApiTags('certificate-registry')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('certificate-registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List every issued/voided certificate number across courses and donations.' })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.registry.findAll(actor);
  }
}
