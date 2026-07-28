import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Send an announcement to a set of users as an in-app notification. Admin is scoped to their own branch.' })
  broadcast(@Body() dto: BroadcastNotificationDto, @CurrentUser() actor: AuthUser) {
    return this.notifications.broadcast(dto, actor);
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'List past broadcasts. Superadmin sees all; admin sees only broadcasts scoped to their own branch.' })
  listBroadcasts(@CurrentUser() actor: AuthUser) {
    return this.notifications.listBroadcasts(actor);
  }

  @Delete('broadcasts/:broadcastId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a broadcast and every recipient notification it created.' })
  async deleteBroadcast(@Param('broadcastId') broadcastId: string, @CurrentUser() actor: AuthUser) {
    await this.notifications.deleteBroadcast(broadcastId, actor);
  }
}
