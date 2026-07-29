import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from './entities/rating.entity';
import { PublicRatingsController } from './public-ratings.controller';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rating])],
  controllers: [PublicRatingsController, RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
