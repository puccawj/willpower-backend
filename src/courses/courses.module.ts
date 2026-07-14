import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBranch } from '../users/entities/user-branch.entity';
import { ClassAttendance } from './entities/class-attendance.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CourseNeed } from './entities/course-need.entity';
import { CourseOffering } from './entities/course-offering.entity';
import { CourseSession } from './entities/course-session.entity';
import { Course } from './entities/course.entity';
import { CourseNeedsController } from './course-needs.controller';
import { CourseNeedsService } from './course-needs.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { PublicCoursesController } from './public-courses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseOffering,
      CourseSession,
      CourseEnrollment,
      ClassAttendance,
      CourseNeed,
      UserBranch,
    ]),
  ],
  controllers: [CoursesController, OfferingsController, EnrollmentController, PublicCoursesController, CourseNeedsController],
  providers: [CoursesService, OfferingsService, EnrollmentService, CourseNeedsService],
  exports: [EnrollmentService, CourseNeedsService],
})
export class CoursesModule {}
