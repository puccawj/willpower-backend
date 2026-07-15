import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBranch } from '../users/entities/user-branch.entity';
import { EventsModule } from '../events/events.module';
import { CoursesModule } from '../courses/courses.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { DonationsController } from './donations.controller';
import { PublicDonationsController } from './public-donations.controller';
import { DonationsService } from './donations.service';
import { Donation } from './entities/donation.entity';
import { DonationCertificate } from './entities/donation-certificate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCertificate, UserBranch]),
    EventsModule,
    CoursesModule,
    CertificatesModule,
  ],
  controllers: [DonationsController, PublicDonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
