import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BranchesModule } from './branches/branches.module';
import { Branch } from './branches/entities/branch.entity';
import { CertificatesModule } from './certificates/certificates.module';
import { CertificateNumberCounter } from './certificates/entities/certificate-number-counter.entity';
import { CertificateTemplate } from './certificates/entities/certificate-template.entity';
import { Certificate } from './certificates/entities/certificate.entity';
import { CoursesModule } from './courses/courses.module';
import { ClassAttendance } from './courses/entities/class-attendance.entity';
import { CourseEnrollment } from './courses/entities/course-enrollment.entity';
import { CourseNeed } from './courses/entities/course-need.entity';
import { CoursePhoto } from './courses/entities/course-photo.entity';
import { CoursePrerequisite } from './courses/entities/course-prerequisite.entity';
import { CourseOffering } from './courses/entities/course-offering.entity';
import { CourseSession } from './courses/entities/course-session.entity';
import { Course } from './courses/entities/course.entity';
import { DonationsModule } from './donations/donations.module';
import { Donation } from './donations/entities/donation.entity';
import { DonationCertificate } from './donations/entities/donation-certificate.entity';
import { EventsModule } from './events/events.module';
import { Event } from './events/entities/event.entity';
import { EventAttendance } from './events/entities/event-attendance.entity';
import { EventNeed } from './events/entities/event-need.entity';
import { EventPhoto } from './events/entities/event-photo.entity';
import { EventRsvp } from './events/entities/event-rsvp.entity';
import { EventWaitlist } from './events/entities/event-waitlist.entity';
import { HomeBanner } from './home-banners/entities/home-banner.entity';
import { HomeBannersModule } from './home-banners/home-banners.module';
import { MeModule } from './me/me.module';
import { Rating } from './ratings/entities/rating.entity';
import { RatingsModule } from './ratings/ratings.module';
import { StudentApplication } from './student-applications/entities/student-application.entity';
import { StudentApplicationsModule } from './student-applications/student-applications.module';
import { Notification } from './notifications/entities/notification.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SiteContent } from './site-content/entities/site-content.entity';
import { SiteContentModule } from './site-content/site-content.module';
import { TeamMembersModule } from './team-members/team-members.module';
import { TeamMember } from './team-members/entities/team-member.entity';
import { UploadsModule } from './uploads/uploads.module';
import { User } from './users/entities/user.entity';
import { UserBranch } from './users/entities/user-branch.entity';
import { UserDevice } from './users/entities/user-device.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          Branch,
          User,
          UserBranch,
          Event,
          EventRsvp,
          EventWaitlist,
          EventAttendance,
          EventNeed,
          EventPhoto,
          Donation,
          DonationCertificate,
          TeamMember,
          Course,
          CourseOffering,
          CourseSession,
          CourseEnrollment,
          CourseNeed,
          CoursePhoto,
          CoursePrerequisite,
          ClassAttendance,
          CertificateTemplate,
          Certificate,
          CertificateNumberCounter,
          Notification,
          UserDevice,
          SiteContent,
          HomeBanner,
          Rating,
          StudentApplication,
        ],
        synchronize: false,
      }),
    }),
    AuthModule,
    BranchesModule,
    UploadsModule,
    UsersModule,
    EventsModule,
    DonationsModule,
    TeamMembersModule,
    CoursesModule,
    CertificatesModule,
    ReportsModule,
    NotificationsModule,
    SiteContentModule,
    HomeBannersModule,
    RatingsModule,
    StudentApplicationsModule,
    MeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
