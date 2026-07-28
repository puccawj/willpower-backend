import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { BranchesService } from './branches.service';

@ApiTags('public-branches')
@Public()
@Controller('public/branches')
export class PublicBranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List active branches for the public website.' })
  findAll() {
    return this.branches.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single active branch for the public website.' })
  findOne(@Param('id') id: string) {
    return this.branches.findOnePublic(id);
  }
}
