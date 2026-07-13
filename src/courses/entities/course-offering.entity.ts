import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OfferingMode = 'online' | 'onsite';
export type OfferingStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const MODES: OfferingMode[] = ['online', 'onsite'];
const STATUSES: OfferingStatus[] = ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'];

@Entity({ name: 'course_offerings' })
export class CourseOffering {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ApiProperty()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'instructor_id', type: 'uuid', nullable: true })
  instructorId: string | null;

  @ApiProperty()
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @ApiProperty()
  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @ApiProperty({ enum: MODES })
  @Column({ type: 'enum', enumName: 'offering_mode', enum: MODES })
  mode: OfferingMode;

  @ApiProperty({ enum: STATUSES })
  @Column({ type: 'enum', enumName: 'offering_status', enum: STATUSES, default: 'draft' })
  status: OfferingStatus;

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
