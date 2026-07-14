import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateEventNeedDto } from './dto/create-event-need.dto';
import { UpdateEventNeedDto } from './dto/update-event-need.dto';
import { EventNeedsService } from './event-needs.service';

@ApiTags('event-needs')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('events/:eventId/needs')
export class EventNeedsController {
  constructor(private readonly needs: EventNeedsService) {}

  @Get()
  @ApiOperation({ summary: 'List the donation wishlist items for an event.' })
  findAll(@Param('eventId') eventId: string) {
    return this.needs.findAllForEvent(eventId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a wishlist item (need) to an event.' })
  create(@Param('eventId') eventId: string, @Body() dto: CreateEventNeedDto, @CurrentUser() actor: AuthUser) {
    return this.needs.create(eventId, dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wishlist item.' })
  update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventNeedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.needs.update(eventId, id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a wishlist item.' })
  async remove(@Param('eventId') eventId: string, @Param('id') id: string) {
    await this.needs.remove(eventId, id);
  }
}
