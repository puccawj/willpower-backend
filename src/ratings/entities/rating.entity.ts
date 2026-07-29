import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RatingTargetType = 'event' | 'offering';

@Entity({ name: 'ratings' })
@Index(['targetType', 'targetId'])
@Index(['targetType', 'targetId', 'userId'], { unique: true })
export class Rating {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: ['event', 'offering'] })
  @Column({ name: 'target_type', type: 'enum', enumName: 'rating_target_type', enum: ['event', 'offering'] })
  targetType: RatingTargetType;

  @ApiProperty()
  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Column({ type: 'smallint' })
  stars: number;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
