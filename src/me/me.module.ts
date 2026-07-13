import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { EventRsvp } from '../events/entities/event-rsvp.entity';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Donation } from '../donations/entities/donation.entity';
import { EventsModule } from '../events/events.module';
import { CoursesModule } from '../courses/courses.module';
import { DonationsModule } from '../donations/donations.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EventRsvp, CourseEnrollment, Certificate, Donation]),
    EventsModule,
    CoursesModule,
    DonationsModule,
  ],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
