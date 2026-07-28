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
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role (create/delete require superadmin).' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List branches with computed admin/user/event counts. Superadmin sees all; admin sees only their own.' })
  @ApiOkResponse({ type: Branch, isArray: true })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.branches.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single branch by id.' })
  @ApiOkResponse({ type: Branch })
  @ApiNotFoundResponse({ description: 'Branch not found.' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.branches.findOne(id, actor);
  }

  @Post()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Create a new branch. Superadmin only.' })
  @ApiOkResponse({ type: Branch })
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: AuthUser) {
    return this.branches.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a branch. Admin can only update their own branch's info; status changes require superadmin." })
  @ApiOkResponse({ type: Branch })
  @ApiNotFoundResponse({ description: 'Branch not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() actor: AuthUser) {
    return this.branches.update(id, dto, actor.id, actor);
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
