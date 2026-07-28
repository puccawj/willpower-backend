import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NotificationType =
  | 'event_published'
  | 'event_updated'
  | 'event_cancelled'
  | 'rsvp_reminder'
  | 'waitlist_promoted'
  | 'donation_verified'
  | 'class_reminder'
  | 'absence_alert'
  | 'course_completed'
  | 'certificate_issued'
  | 'system';

const TYPES: NotificationType[] = [
  'event_published',
  'event_updated',
  'event_cancelled',
  'rsvp_reminder',
  'waitlist_promoted',
  'donation_verified',
  'class_reminder',
  'absence_alert',
  'course_completed',
  'certificate_issued',
  'system',
];

@Entity({ name: 'notifications' })
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ enum: TYPES })
  @Column({ type: 'enum', enumName: 'notification_type', enum: TYPES })
  type: NotificationType;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  message: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'related_entity', type: 'varchar', length: 50, nullable: true })
  relatedEntity: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  @ApiProperty()
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'broadcast_id', type: 'uuid', nullable: true })
  broadcastId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'target_branch_id', type: 'uuid', nullable: true })
  targetBranchId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
