import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamMember } from './entities/team-member.entity';
import { TeamMembersService } from './team-members.service';

@ApiTags('team-members')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly members: TeamMembersService) {}

  @Get()
  @ApiOperation({ summary: 'List team members. Admins only see members of their assigned branches.' })
  @ApiOkResponse({ type: TeamMember, isArray: true })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.members.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single team member by id.' })
  @ApiOkResponse({ type: TeamMember })
  @ApiNotFoundResponse({ description: 'Team member not found.' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.members.findOne(id, actor);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new team member.' })
  @ApiOkResponse({ type: TeamMember })
  create(@Body() dto: CreateTeamMemberDto, @CurrentUser() actor: AuthUser) {
    return this.members.create(dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team member.' })
  @ApiOkResponse({ type: TeamMember })
  @ApiNotFoundResponse({ description: 'Team member not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto, @CurrentUser() actor: AuthUser) {
    return this.members.update(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team member.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Team member not found.' })
  async remove(@Param('id') id: string) {
    await this.members.remove(id);
  }
}
