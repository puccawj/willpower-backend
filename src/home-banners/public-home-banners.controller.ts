import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HomeBannersService } from './home-banners.service';

@ApiTags('public-home-banners')
@Public()
@Controller('public/home-banners')
export class PublicHomeBannersController {
  constructor(private readonly banners: HomeBannersService) {}

  @Get()
  @ApiOperation({ summary: 'List currently active Home page banners (active flag + within date window), in display order.' })
  findActive() {
    return this.banners.findActivePublic();
  }
}
