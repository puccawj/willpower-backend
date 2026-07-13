import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CourseOffering } from './entities/course-offering.entity';
import { OfferingsService } from './offerings.service';

@ApiTags('course-offerings')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin, admin, or instructor role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin', 'instructor')
@Controller('course-offerings')
export class OfferingsController {
  constructor(private readonly offerings: OfferingsService) {}

  @Get()
  @ApiOperation({ summary: 'List offerings. Instructors see only their own; admins see only their branches.' })
  @ApiOkResponse({ type: CourseOffering, isArray: true })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.offerings.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single offering by id.' })
  @ApiOkResponse({ type: CourseOffering })
  @ApiNotFoundResponse({ description: 'Offering not found.' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.offerings.findOne(id, actor);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'List the auto-generated session calendar for an offering.' })
  listSessions(@Param('id') id: string) {
    return this.offerings.listSessions(id);
  }

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new course offering. Sessions are auto-generated weekly from the start date.' })
  @ApiOkResponse({ type: CourseOffering })
  create(@Body() dto: CreateOfferingDto, @CurrentUser() actor: AuthUser) {
    return this.offerings.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a course offering.' })
  @ApiOkResponse({ type: CourseOffering })
  @ApiNotFoundResponse({ description: 'Offering not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateOfferingDto, @CurrentUser() actor: AuthUser) {
    return this.offerings.update(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a course offering.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Offering not found.' })
  async remove(@Param('id') id: string) {
    await this.offerings.softDelete(id);
  }
}
