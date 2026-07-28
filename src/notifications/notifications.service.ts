import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { BranchAccessService } from '../common/branch-access.service';
import { User } from '../users/entities/user.entity';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { DevicesService } from './devices.service';
import { Notification } from './entities/notification.entity';
import { PushService } from './push.service';

export interface BroadcastHistoryRow {
  broadcastId: string;
  title: string;
  message: string;
  targetBranchId: string | null;
  targetBranchName: string | null;
  recipientCount: number;
  sentAt: Date;
  sentByName: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly branchAccess: BranchAccessService,
    private readonly devices: DevicesService,
    private readonly push: PushService,
  ) {}

  async broadcast(dto: BroadcastNotificationDto, actor: AuthUser): Promise<{ recipientCount: number }> {
    let branchId: string | null = null;

    if (actor.role === 'superadmin') {
      if (dto.scope === 'branch') {
        if (!dto.branchId) throw new BadRequestException('branchId is required when scope is "branch".');
        branchId = dto.branchId;
      }
    } else {
      const branchIds = await this.branchAccess.branchIdsOf(actor.id);
      if (branchIds.size === 0) throw new ForbiddenException('You have no assigned branch to broadcast to.');
      if (dto.scope === 'all') throw new ForbiddenException('You can only broadcast to your own branch.');
      if (!dto.branchId || !branchIds.has(dto.branchId)) {
        throw new ForbiddenException('You can only broadcast to your own branch.');
      }
      branchId = dto.branchId;
    }

    const qb = this.users
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .where('u.deleted_at IS NULL')
      .andWhere("u.status = 'active'");
    if (branchId) qb.andWhere('u.primary_branch_id = :branchId', { branchId });
    if (dto.studentsOnly) qb.andWhere("u.role = 'student'");

    const recipients: { id: string }[] = await qb.getRawMany();
    if (recipients.length === 0) return { recipientCount: 0 };

    const broadcastId = randomUUID();
    const rows = recipients.map((r) =>
      this.notifications.create({
        userId: r.id,
        type: 'system',
        title: dto.title,
        message: dto.message,
        broadcastId,
        targetBranchId: branchId,
        createdBy: actor.id,
      }),
    );
    await this.notifications.save(rows);
    void this.sendPush(recipients.map((r) => r.id), dto.title, dto.message, broadcastId);
    return { recipientCount: rows.length };
  }

  /** Fire-and-forget: push delivery failures must never block the in-app notification from being created. */
  private async sendPush(userIds: string[], title: string, body: string, broadcastId: string): Promise<void> {
    if (!this.push.isConfigured) return;
    const tokens = await this.devices.tokensForUsers(userIds);
    if (tokens.length === 0) return;
    const result = await this.push.sendToTokens(tokens, { title, body }, { type: 'system', broadcastId });
    if (result.invalidTokens.length) await this.devices.removeInvalidTokens(result.invalidTokens);
  }

  async listBroadcasts(actor: AuthUser): Promise<BroadcastHistoryRow[]> {
    const branchFilter = actor.role === 'superadmin' ? null : [...(await this.branchAccess.branchIdsOf(actor.id))];
    if (branchFilter && branchFilter.length === 0) return [];

    const rows = await this.notifications.query(
      `SELECT
         n.broadcast_id,
         MIN(n.title) AS title,
         MIN(n.message) AS message,
         n.target_branch_id,
         b.name AS target_branch_name,
         COUNT(*)::int AS recipient_count,
         MIN(n.created_at) AS sent_at,
         MIN(u.first_name || ' ' || u.last_name) AS sent_by_name
       FROM notifications n
       LEFT JOIN branches b ON b.id = n.target_branch_id
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.broadcast_id IS NOT NULL
         AND ($1::uuid[] IS NULL OR n.target_branch_id = ANY($1))
       GROUP BY n.broadcast_id, n.target_branch_id, b.name
       ORDER BY sent_at DESC`,
      [branchFilter],
    );

    return rows.map((r: any) => ({
      broadcastId: r.broadcast_id,
      title: r.title,
      message: r.message,
      targetBranchId: r.target_branch_id,
      targetBranchName: r.target_branch_name,
      recipientCount: Number(r.recipient_count),
      sentAt: r.sent_at,
      sentByName: r.sent_by_name,
    }));
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notifications.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifications.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, isRead: false }, { isRead: true });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.notifications.delete({ id, userId });
  }
}
