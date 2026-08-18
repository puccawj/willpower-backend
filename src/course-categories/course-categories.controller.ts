import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CourseCategoriesService } from './course-categories.service';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';
import { CourseCategory } from './entities/course-category.entity';

@ApiTags('course-categories')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('course-categories')
export class CourseCategoriesController {
  constructor(private readonly categories: CourseCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all course categories (including inactive ones).' })
  @ApiOkResponse({ type: CourseCategory, isArray: true })
  findAll() {
    return this.categories.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course category.' })
  @ApiOkResponse({ type: CourseCategory })
  create(@Body() dto: CreateCourseCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course category (rename or toggle active).' })
  @ApiOkResponse({ type: CourseCategory })
  @ApiNotFoundResponse({ description: 'Course category not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course category. Blocked if any course still uses it.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Course category not found.' })
  async remove(@Param('id') id: string) {
    await this.categories.remove(id);
  }
}
