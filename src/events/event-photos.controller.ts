import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateEventPhotoDto } from './dto/create-event-photo.dto';
import { UpdateEventPhotoDto } from './dto/update-event-photo.dto';
import { EventPhotosService } from './event-photos.service';

@ApiTags('event-photos')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('events/:eventId/photos')
export class EventPhotosController {
  constructor(private readonly photos: EventPhotosService) {}

  @Get()
  @ApiOperation({ summary: "List an event's atmosphere photos." })
  findAll(@Param('eventId') eventId: string) {
    return this.photos.findAllForEvent(eventId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a photo to an event gallery.' })
  create(@Param('eventId') eventId: string, @Body() dto: CreateEventPhotoDto, @CurrentUser() actor: AuthUser) {
    return this.photos.create(eventId, dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a photo's caption." })
  update(@Param('eventId') eventId: string, @Param('id') id: string, @Body() dto: UpdateEventPhotoDto) {
    return this.photos.update(eventId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a photo from an event gallery.' })
  async remove(@Param('eventId') eventId: string, @Param('id') id: string) {
    await this.photos.remove(eventId, id);
  }
}
