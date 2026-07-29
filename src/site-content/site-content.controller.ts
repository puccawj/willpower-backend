import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';
import { SiteContentService } from './site-content.service';

@ApiTags('site-content')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('site-content')
export class SiteContentController {
  constructor(private readonly siteContent: SiteContentService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public page\'s editable content by slug (e.g. "about", "privacy-policy").' })
  findOne(@Param('slug') slug: string) {
    return this.siteContent.findBySlug(slug);
  }

  @Put(':slug')
  @ApiOperation({ summary: 'Replace a public page\'s content.' })
  update(@Param('slug') slug: string, @Body() dto: UpdateSiteContentDto, @CurrentUser() actor: AuthUser) {
    return this.siteContent.upsert(slug, dto.content, actor.id);
  }
}
