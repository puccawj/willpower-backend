import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { EventsService } from './events.service';
import { EventNeedsService } from './event-needs.service';

@ApiTags('public-events')
@Public()
@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly events: EventsService,
    private readonly needs: EventNeedsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published events for the public website.' })
  findAll() {
    return this.events.findPublished();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single published event by id for the public website.' })
  findOne(@Param('id') id: string) {
    return this.events.findOnePublished(id);
  }

  @Get(':id/needs')
  @ApiOperation({ summary: "List an event's donation wishlist items for the public website." })
  findNeeds(@Param('id') id: string) {
    return this.needs.findAllForEvent(id);
  }
}
