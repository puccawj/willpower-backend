import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PhotoStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'event_photos' })
export class EventPhoto {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty()
  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 300, nullable: true })
  caption: string | null;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  @Column({ type: 'enum', enumName: 'photo_status', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: PhotoStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
