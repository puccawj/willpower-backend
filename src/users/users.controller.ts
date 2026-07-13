import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService, UserWithBranches } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users. Admins only see users sharing one of their branches, and never see superadmins.' })
  @ApiOkResponse({ type: User, isArray: true })
  async findAll(@CurrentUser() actor: AuthUser) {
    return (await this.users.findAll(actor)).map(sanitize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by id.' })
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return sanitize(await this.users.findOne(id, actor));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user. Only a superadmin can create another superadmin.' })
  @ApiOkResponse({ type: User })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return sanitize(await this.users.create(dto, actor));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user. Omit `password` to keep the current one. Only a superadmin can modify a superadmin.' })
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return sanitize(await this.users.update(id, dto, actor));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (sets deleted_at, row is retained in the database).' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'User not found.' })
  async remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    await this.users.softDelete(id, actor);
  }
}

function sanitize(user: UserWithBranches): Omit<UserWithBranches, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
