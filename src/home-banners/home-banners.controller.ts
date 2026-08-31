import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateHomeBannerDto } from './dto/create-home-banner.dto';
import { UpdateHomeBannerDto } from './dto/update-home-banner.dto';
import { HomeBannersService } from './home-banners.service';

@ApiTags('home-banners')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin')
@Controller('home-banners')
export class HomeBannersController {
  constructor(private readonly banners: HomeBannersService) {}

  @Get()
  @ApiOperation({ summary: 'List all Home page banners (including inactive/scheduled ones).' })
  findAll() {
    return this.banners.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Add a Home page banner.' })
  create(@Body() dto: CreateHomeBannerDto) {
    return this.banners.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Home page banner.' })
  update(@Param('id') id: string, @Body() dto: UpdateHomeBannerDto) {
    return this.banners.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a Home page banner.' })
  async remove(@Param('id') id: string) {
    await this.banners.remove(id);
  }
}
