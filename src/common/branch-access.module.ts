import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBranch } from '../users/entities/user-branch.entity';
import { BranchAccessService } from './branch-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserBranch])],
  providers: [BranchAccessService],
  exports: [BranchAccessService],
})
export class BranchAccessModule {}
