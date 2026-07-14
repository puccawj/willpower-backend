import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EventNeedType = 'money' | 'goods';

const TYPES: EventNeedType[] = ['money', 'goods'];

@Entity({ name: 'event_needs' })
export class EventNeed {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiProperty({ enum: TYPES })
  @Column({ type: 'enum', enumName: 'event_need_type', enum: TYPES })
  type: EventNeedType;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @ApiProperty()
  @Column({ name: 'target_quantity', type: 'numeric', precision: 12, scale: 2 })
  targetQuantity: string;

  @ApiProperty()
  @Column({ name: 'received_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
  receivedQuantity: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

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
