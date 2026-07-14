import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Event } from './entities/event.entity';
import { EventAttendance } from './entities/event-attendance.entity';
import { EventNeed } from './entities/event-need.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventWaitlist } from './entities/event-waitlist.entity';
import { EventNeedsController } from './event-needs.controller';
import { EventNeedsService } from './event-needs.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PublicEventsController } from './public-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRsvp, EventWaitlist, EventAttendance, EventNeed])],
  controllers: [EventsController, AttendanceController, PublicEventsController, EventNeedsController],
  providers: [EventsService, AttendanceService, EventNeedsService],
  exports: [AttendanceService, EventNeedsService],
})
export class EventsModule {}
