import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateCoursePhotoDto } from './dto/create-course-photo.dto';
import { UpdateCoursePhotoDto } from './dto/update-course-photo.dto';
import { CoursePhotosService } from './course-photos.service';

@ApiTags('course-photos')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('courses/:courseId/photos')
export class CoursePhotosController {
  constructor(private readonly photos: CoursePhotosService) {}

  @Get()
  @ApiOperation({ summary: "List a course's atmosphere photos." })
  findAll(@Param('courseId') courseId: string) {
    return this.photos.findAllForCourse(courseId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a photo to a course gallery.' })
  create(@Param('courseId') courseId: string, @Body() dto: CreateCoursePhotoDto, @CurrentUser() actor: AuthUser) {
    return this.photos.create(courseId, dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a photo's caption." })
  update(@Param('courseId') courseId: string, @Param('id') id: string, @Body() dto: UpdateCoursePhotoDto) {
    return this.photos.update(courseId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a photo from a course gallery.' })
  async remove(@Param('courseId') courseId: string, @Param('id') id: string) {
    await this.photos.remove(courseId, id);
  }
}
