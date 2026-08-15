import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { RatingsService } from '../ratings/ratings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CourseOffering } from './entities/course-offering.entity';
import { OfferingsService } from './offerings.service';

@ApiTags('course-offerings')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin, admin, or instructor role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin', 'instructor')
@Controller('course-offerings')
export class OfferingsController {
  constructor(
    private readonly offerings: OfferingsService,
    private readonly ratings: RatingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List offerings. Superadmin sees everything; admin/instructor see only their own branches.' })
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
  @ApiOperation({ summary: 'List the sessions the admin has built for this offering.' })
  listSessions(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.offerings.listSessions(id, actor);
  }

  @Post(':id/sessions')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: "Add a session (class meeting) to this offering's schedule, with an explicit date/time." })
  addSession(@Param('id') id: string, @Body() dto: CreateSessionDto, @CurrentUser() actor: AuthUser) {
    return this.offerings.addSession(id, dto, actor);
  }

  @Patch(':id/sessions/:sessionId')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: "Edit a session's date/time/topic/location — e.g. for a reschedule." })
  updateSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.offerings.updateSession(id, sessionId, dto, actor);
  }

  @Delete(':id/sessions/:sessionId')
  @Roles('superadmin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a session — e.g. for a cancelled holiday class.' })
  @ApiNoContentResponse()
  async removeSession(@Param('id') id: string, @Param('sessionId') sessionId: string, @CurrentUser() actor: AuthUser) {
    await this.offerings.removeSession(id, sessionId, actor);
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'List every rating (stars + private note + who gave it) submitted for this offering, newest first.' })
  listRatings(@Param('id') id: string) {
    return this.ratings.adminList('offering', id);
  }

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new course offering. Sessions are added separately via POST :id/sessions.' })
  @ApiOkResponse({ type: CourseOffering })
  create(@Body() dto: CreateOfferingDto, @CurrentUser() actor: AuthUser) {
    return this.offerings.create(dto, actor);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a course offering.' })
  @ApiOkResponse({ type: CourseOffering })
  @ApiNotFoundResponse({ description: 'Offering not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateOfferingDto, @CurrentUser() actor: AuthUser) {
    return this.offerings.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a course offering.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Offering not found.' })
  async remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.offerings.softDelete(id, actor);
  }
}
