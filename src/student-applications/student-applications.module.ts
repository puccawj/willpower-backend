import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { StudentApplication } from './entities/student-application.entity';
import { StudentApplicationsController } from './student-applications.controller';
import { StudentApplicationsService } from './student-applications.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentApplication, User])],
  controllers: [StudentApplicationsController],
  providers: [StudentApplicationsService],
  exports: [StudentApplicationsService],
})
export class StudentApplicationsModule {}
