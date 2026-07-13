import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';

@ApiTags('courses')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin, admin, or instructor role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin', 'instructor')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active (non-deleted) courses.' })
  @ApiOkResponse({ type: Course, isArray: true })
  findAll() {
    return this.courses.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single course by id.' })
  @ApiOkResponse({ type: Course })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  findOne(@Param('id') id: string) {
    return this.courses.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new course.' })
  @ApiOkResponse({ type: Course })
  create(@Body() dto: CreateCourseDto, @CurrentUser() actor: AuthUser) {
    return this.courses.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a course.' })
  @ApiOkResponse({ type: Course })
  @ApiNotFoundResponse({ description: 'Course not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto, @CurrentUser() actor: AuthUser) {
    return this.courses.update(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a course.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Course not found.' })
  async remove(@Param('id') id: string) {
    await this.courses.softDelete(id);
  }
}
