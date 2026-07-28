import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchAccessModule } from '../common/branch-access.module';
import { CourseOffering } from '../courses/entities/course-offering.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseOffering]), BranchAccessModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
