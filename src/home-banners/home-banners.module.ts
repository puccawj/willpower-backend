import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeBanner } from './entities/home-banner.entity';
import { HomeBannersController } from './home-banners.controller';
import { PublicHomeBannersController } from './public-home-banners.controller';
import { HomeBannersService } from './home-banners.service';

@Module({
  imports: [TypeOrmModule.forFeature([HomeBanner])],
  controllers: [HomeBannersController, PublicHomeBannersController],
  providers: [HomeBannersService],
})
export class HomeBannersModule {}
