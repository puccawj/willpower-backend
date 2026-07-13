import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role (write operations require superadmin).' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active (non-deleted) branches with computed admin/user/event counts.' })
  @ApiOkResponse({ type: Branch, isArray: true })
  findAll() {
    return this.branches.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single branch by id.' })
  @ApiOkResponse({ type: Branch })
  @ApiNotFoundResponse({ description: 'Branch not found.' })
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Post()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Create a new branch. Superadmin only.' })
  @ApiOkResponse({ type: Branch })
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: AuthUser) {
    return this.branches.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Update a branch. Superadmin only.' })
  @ApiOkResponse({ type: Branch })
  @ApiNotFoundResponse({ description: 'Branch not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: AuthUser) {
    return this.branches.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('superadmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a branch (sets deleted_at, row is retained in the database). Superadmin only.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Branch not found.' })
  async remove(@Param('id') id: string) {
    await this.branches.softDelete(id);
  }
}
