import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchAccessModule } from '../common/branch-access.module';
import { User } from '../users/entities/user.entity';
import { UserDevice } from '../users/entities/user-device.entity';
import { DevicesService } from './devices.service';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, UserDevice]), BranchAccessModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DevicesService, PushService],
  exports: [NotificationsService, DevicesService],
})
export class NotificationsModule {}
