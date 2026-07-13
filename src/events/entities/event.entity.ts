import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EventStatus = 'draft' | 'published' | 'closed';

const STATUSES: EventStatus[] = ['draft', 'published', 'closed'];

@Entity({ name: 'events' })
export class Event {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  coverImageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @ApiProperty()
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @ApiProperty()
  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'rsvp_cutoff_at', type: 'timestamptz', nullable: true })
  rsvpCutoffAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'publish_at', type: 'timestamptz', nullable: true })
  publishAt: Date | null;

  @ApiProperty({ enum: STATUSES })
  @Column({ type: 'enum', enumName: 'event_status', enum: STATUSES, default: 'draft' })
  status: EventStatus;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
