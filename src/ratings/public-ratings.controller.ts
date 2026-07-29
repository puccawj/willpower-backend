import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import type { RatingTargetType } from './entities/rating.entity';
import { RatingsService } from './ratings.service';

@ApiTags('public-ratings')
@Public()
@Controller('public/ratings')
export class PublicRatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get(':targetType/:targetId')
  @ApiOperation({ summary: 'Get the aggregate star rating (average + count only, never notes) for one event or offering.' })
  summary(@Param('targetType') targetType: RatingTargetType, @Param('targetId') targetId: string) {
    return this.ratings.summary(targetType, targetId);
  }

  @Get(':targetType')
  @ApiOperation({ summary: 'Get aggregate star ratings for many events/offerings at once (?ids=a,b,c), for list pages.' })
  async bulk(@Param('targetType') targetType: RatingTargetType, @Query('ids') ids: string) {
    const targetIds = (ids ?? '').split(',').filter(Boolean);
    const map = await this.ratings.summaryBulk(targetType, targetIds);
    return Object.fromEntries(map);
  }
}
