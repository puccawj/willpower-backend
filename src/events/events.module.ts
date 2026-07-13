import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Event } from './entities/event.entity';
import { EventAttendance } from './entities/event-attendance.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventWaitlist } from './entities/event-waitlist.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PublicEventsController } from './public-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRsvp, EventWaitlist, EventAttendance])],
  controllers: [EventsController, AttendanceController, PublicEventsController],
  providers: [EventsService, AttendanceService],
  exports: [AttendanceService],
})
export class EventsModule {}
