import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CourseStatus = 'active' | 'inactive';

const STATUSES: CourseStatus[] = ['active', 'inactive'];

@Entity({ name: 'courses' })
export class Course {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 200 })
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Freeform teaching topics/curriculum, one item per line.' })
  @Column({ type: 'text', nullable: true })
  syllabus: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  @Column({ name: 'total_sessions', type: 'int' })
  totalSessions: number;

  @ApiProperty()
  @Column({ name: 'passing_attendance_percent', type: 'numeric', precision: 5, scale: 2, default: 80 })
  passingAttendancePercent: string;

  @ApiProperty({ enum: STATUSES })
  @Column({ type: 'enum', enumName: 'course_status', enum: STATUSES, default: 'active' })
  status: CourseStatus;

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
