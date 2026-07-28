import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchAccessModule } from '../common/branch-access.module';
import { Branch } from './entities/branch.entity';
import { BranchesController } from './branches.controller';
import { PublicBranchesController } from './public-branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Branch]), BranchAccessModule],
  controllers: [BranchesController, PublicBranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
