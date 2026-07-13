import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TeamMembersService } from './team-members.service';

@ApiTags('public-team')
@Public()
@Controller('public/team')
export class PublicTeamController {
  constructor(private readonly members: TeamMembersService) {}

  @Get()
  @ApiOperation({ summary: 'List team members marked visible on the public website.' })
  findAll() {
    return this.members.findAllPublic();
  }
}
