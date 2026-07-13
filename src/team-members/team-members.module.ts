import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBranch } from '../users/entities/user-branch.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { PublicTeamController } from './public-team.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, UserBranch])],
  controllers: [TeamMembersController, PublicTeamController],
  providers: [TeamMembersService],
})
export class TeamMembersModule {}
