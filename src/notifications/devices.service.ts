import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../users/entities/user-device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(@InjectRepository(UserDevice) private readonly devices: Repository<UserDevice>) {}

  async register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    const existing = await this.devices.findOne({ where: { userId, pushToken: dto.pushToken } });
    if (existing) {
      existing.platform = dto.platform;
      existing.deviceModel = dto.deviceModel ?? existing.deviceModel;
      existing.appVersion = dto.appVersion ?? existing.appVersion;
      existing.lastActiveAt = new Date();
      await this.devices.save(existing);
      return;
    }

    await this.devices.save(
      this.devices.create({
        userId,
        platform: dto.platform,
        pushToken: dto.pushToken,
        deviceModel: dto.deviceModel ?? null,
        appVersion: dto.appVersion ?? null,
        lastActiveAt: new Date(),
      }),
    );
  }

  async unregister(userId: string, pushToken: string): Promise<void> {
    await this.devices.delete({ userId, pushToken });
  }

  async tokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.devices
      .createQueryBuilder('d')
      .select('DISTINCT d.push_token', 'push_token')
      .where('d.user_id IN (:...userIds)', { userIds })
      .getRawMany();
    return rows.map((r) => r.push_token);
  }

  /** Called after a push send attempt returns "not registered" for a token — evicts stale tokens so we stop retrying them. */
  async removeInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.devices.createQueryBuilder().delete().where('push_token IN (:...tokens)', { tokens }).execute();
    this.logger.log(`Removed ${tokens.length} invalid push token(s).`);
  }
}
