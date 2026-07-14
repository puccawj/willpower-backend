import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBranch } from '../users/entities/user-branch.entity';
import { EventsModule } from '../events/events.module';
import { CoursesModule } from '../courses/courses.module';
import { DonationsController } from './donations.controller';
import { PublicDonationsController } from './public-donations.controller';
import { DonationsService } from './donations.service';
import { Donation } from './entities/donation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, UserBranch]), EventsModule, CoursesModule],
  controllers: [DonationsController, PublicDonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
