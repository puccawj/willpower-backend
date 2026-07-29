import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteContent } from './entities/site-content.entity';

@Injectable()
export class SiteContentService {
  constructor(@InjectRepository(SiteContent) private readonly repo: Repository<SiteContent>) {}

  async findBySlug(slug: string): Promise<SiteContent> {
    const row = await this.repo.findOne({ where: { slug } });
    if (!row) throw new NotFoundException(`No site content found for "${slug}".`);
    return row;
  }

  /** Public-facing lookup — returns an empty object instead of 404 so an unedited page renders fine. */
  async findContentForPublic(slug: string): Promise<Record<string, unknown>> {
    const row = await this.repo.findOne({ where: { slug } });
    return row?.content ?? {};
  }

  async upsert(slug: string, content: Record<string, unknown>, actorId: string): Promise<SiteContent> {
    const existing = await this.repo.findOne({ where: { slug } });
    if (existing) {
      existing.content = content;
      existing.updatedBy = actorId;
      return this.repo.save(existing);
    }
    const created = this.repo.create({ slug, content, updatedBy: actorId });
    return this.repo.save(created);
  }
}
