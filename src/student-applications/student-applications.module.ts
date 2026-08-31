import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchAccessModule } from '../common/branch-access.module';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { UserBranch } from '../users/entities/user-branch.entity';
import { StudentApplication } from './entities/student-application.entity';
import { StudentApplicationBranch } from './entities/student-application-branch.entity';
import { StudentApplicationsController } from './student-applications.controller';
import { StudentApplicationsService } from './student-applications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentApplication, StudentApplicationBranch, Branch, User, UserBranch]),
    BranchAccessModule,
  ],
  controllers: [StudentApplicationsController],
  providers: [StudentApplicationsService],
  exports: [StudentApplicationsService],
})
export class StudentApplicationsModule {}
