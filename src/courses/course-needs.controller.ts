import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateCourseNeedDto } from './dto/create-course-need.dto';
import { UpdateCourseNeedDto } from './dto/update-course-need.dto';
import { CourseNeedsService } from './course-needs.service';

@ApiTags('course-needs')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('courses/:courseId/needs')
export class CourseNeedsController {
  constructor(private readonly needs: CourseNeedsService) {}

  @Get()
  @ApiOperation({ summary: 'List the donation wishlist items for a course.' })
  findAll(@Param('courseId') courseId: string) {
    return this.needs.findAllForCourse(courseId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a wishlist item (need) to a course.' })
  create(@Param('courseId') courseId: string, @Body() dto: CreateCourseNeedDto, @CurrentUser() actor: AuthUser) {
    return this.needs.create(courseId, dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wishlist item.' })
  update(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseNeedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.needs.update(courseId, id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a wishlist item.' })
  async remove(@Param('courseId') courseId: string, @Param('id') id: string) {
    await this.needs.remove(courseId, id);
  }
}
