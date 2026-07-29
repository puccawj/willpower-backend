import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteContent } from './entities/site-content.entity';
import { PublicSiteContentController } from './public-site-content.controller';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteContent])],
  controllers: [SiteContentController, PublicSiteContentController],
  providers: [SiteContentService],
})
export class SiteContentModule {}
