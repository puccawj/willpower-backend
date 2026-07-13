import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active (non-deleted) events with computed RSVP/waitlist counts.' })
  @ApiOkResponse({ type: Event, isArray: true })
  findAll() {
    return this.events.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by id.' })
  @ApiOkResponse({ type: Event })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  findOne(@Param('id') id: string) {
    return this.events.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new event.' })
  @ApiOkResponse({ type: Event })
  create(@Body() dto: CreateEventDto, @CurrentUser() actor: AuthUser) {
    return this.events.create(dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event.' })
  @ApiOkResponse({ type: Event })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() actor: AuthUser) {
    return this.events.update(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an event (sets deleted_at, row is retained in the database).' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Event not found.' })
  async remove(@Param('id') id: string) {
    await this.events.softDelete(id);
  }
}
