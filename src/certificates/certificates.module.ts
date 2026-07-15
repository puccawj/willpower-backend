import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { CourseOffering } from '../courses/entities/course-offering.entity';
import { Course } from '../courses/entities/course.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateNumberCounter } from './entities/certificate-number-counter.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateNumberingService } from './certificate-numbering.service';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificateTemplate,
      Certificate,
      CertificateNumberCounter,
      CourseOffering,
      Course,
      CourseEnrollment,
    ]),
  ],
  controllers: [TemplatesController, CertificatesController, RegistryController],
  providers: [TemplatesService, CertificatesService, CertificateNumberingService, RegistryService],
  exports: [CertificateNumberingService],
})
export class CertificatesModule {}
