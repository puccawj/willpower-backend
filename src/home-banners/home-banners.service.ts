import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeBanner } from './entities/home-banner.entity';
import { CreateHomeBannerDto } from './dto/create-home-banner.dto';
import { UpdateHomeBannerDto } from './dto/update-home-banner.dto';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class HomeBannersService {
  constructor(@InjectRepository(HomeBanner) private readonly banners: Repository<HomeBanner>) {}

  findAll(): Promise<HomeBanner[]> {
    return this.banners.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async findActivePublic(): Promise<HomeBanner[]> {
    const now = today();
    const all = await this.banners.find({ where: { isActive: true }, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    return all.filter((b) => (!b.startDate || b.startDate <= now) && (!b.endDate || b.endDate >= now));
  }

  async create(dto: CreateHomeBannerDto): Promise<HomeBanner> {
    const banner = this.banners.create({
      imageUrl: dto.imageUrl,
      linkUrl: dto.linkUrl || null,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.banners.save(banner);
  }

  async update(id: string, dto: UpdateHomeBannerDto): Promise<HomeBanner> {
    const banner = await this.getOrThrow(id);
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl || null;
    if (dto.startDate !== undefined) banner.startDate = dto.startDate || null;
    if (dto.endDate !== undefined) banner.endDate = dto.endDate || null;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    return this.banners.save(banner);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.banners.delete(id);
  }

  private async getOrThrow(id: string): Promise<HomeBanner> {
    const banner = await this.banners.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found.');
    return banner;
  }
}
