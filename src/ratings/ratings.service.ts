import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Rating, RatingTargetType } from './entities/rating.entity';

export interface RatingSummary {
  average: number;
  count: number;
}

export interface AdminRatingRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  stars: number;
  note: string | null;
  createdAt: Date;
}

@Injectable()
export class RatingsService {
  constructor(@InjectRepository(Rating) private readonly ratings: Repository<Rating>) {}

  async upsert(targetType: RatingTargetType, targetId: string, userId: string, dto: CreateRatingDto): Promise<Rating> {
    const existing = await this.ratings.findOne({ where: { targetType, targetId, userId } });
    if (existing) {
      existing.stars = dto.stars;
      existing.note = dto.note ?? null;
      return this.ratings.save(existing);
    }
    const created = this.ratings.create({ targetType, targetId, userId, stars: dto.stars, note: dto.note ?? null });
    return this.ratings.save(created);
  }

  myRating(targetType: RatingTargetType, targetId: string, userId: string): Promise<Rating | null> {
    return this.ratings.findOne({ where: { targetType, targetId, userId } });
  }

  async summary(targetType: RatingTargetType, targetId: string): Promise<RatingSummary> {
    const [row] = await this.ratings.query(
      `SELECT COALESCE(ROUND(AVG(stars)::numeric, 1), 0)::float AS average, COUNT(*)::int AS count
       FROM ratings WHERE target_type = $1 AND target_id = $2`,
      [targetType, targetId],
    );
    return { average: Number(row?.average ?? 0), count: Number(row?.count ?? 0) };
  }

  /** Bulk variant for list endpoints (e.g. all offerings) — avoids one query per row. */
  async summaryBulk(targetType: RatingTargetType, targetIds: string[]): Promise<Map<string, RatingSummary>> {
    const map = new Map<string, RatingSummary>();
    if (!targetIds.length) return map;
    const rows = await this.ratings.query(
      `SELECT target_id, COALESCE(ROUND(AVG(stars)::numeric, 1), 0)::float AS average, COUNT(*)::int AS count
       FROM ratings WHERE target_type = $1 AND target_id = ANY($2::uuid[])
       GROUP BY target_id`,
      [targetType, targetIds],
    );
    for (const row of rows) map.set(row.target_id, { average: Number(row.average), count: Number(row.count) });
    return map;
  }

  async countAll(): Promise<number> {
    return this.ratings.count();
  }

  async adminList(targetType: RatingTargetType, targetId: string): Promise<AdminRatingRow[]> {
    const rows = await this.ratings.query(
      `SELECT r.id, r.user_id, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email,
              r.stars, r.note, r.created_at
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.target_type = $1 AND r.target_id = $2
       ORDER BY r.created_at DESC`,
      [targetType, targetId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r['id'] as string,
      userId: r['user_id'] as string,
      userName: r['user_name'] as string,
      userEmail: r['user_email'] as string,
      stars: Number(r['stars']),
      note: (r['note'] as string) ?? null,
      createdAt: r['created_at'] as Date,
    }));
  }
}
