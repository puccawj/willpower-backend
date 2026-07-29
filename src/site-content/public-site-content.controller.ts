import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SiteContentService } from './site-content.service';

@ApiTags('public-site-content')
@Public()
@Controller('public/site-content')
export class PublicSiteContentController {
  constructor(private readonly siteContent: SiteContentService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public page\'s content by slug for the public website (e.g. "about", "privacy-policy").' })
  findOne(@Param('slug') slug: string) {
    return this.siteContent.findContentForPublic(slug);
  }
}
