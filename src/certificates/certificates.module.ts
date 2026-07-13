import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { CourseOffering } from '../courses/entities/course-offering.entity';
import { Course } from '../courses/entities/course.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { Certificate } from './entities/certificate.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CertificateTemplate, Certificate, CourseOffering, Course, CourseEnrollment]),
  ],
  controllers: [TemplatesController, CertificatesController],
  providers: [TemplatesService, CertificatesService],
})
export class CertificatesModule {}
