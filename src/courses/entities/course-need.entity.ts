import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CourseNeedType = 'money' | 'goods';

const TYPES: CourseNeedType[] = ['money', 'goods'];

@Entity({ name: 'course_needs' })
export class CourseNeed {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ApiPropertyOptional({ nullable: true, description: 'Which class session (1-based) this need is for; null = the whole course.' })
  @Column({ name: 'session_number', type: 'int', nullable: true })
  sessionNumber: number | null;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiProperty({ enum: TYPES })
  @Column({ type: 'enum', enumName: 'course_need_type', enum: TYPES })
  type: CourseNeedType;

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
