import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EnrollmentStatus = 'enrolled' | 'waitlist' | 'completed' | 'failed' | 'dropped';

const STATUSES: EnrollmentStatus[] = ['enrolled', 'waitlist', 'completed', 'failed', 'dropped'];

@Entity({ name: 'course_enrollments' })
export class CourseEnrollment {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'offering_id', type: 'uuid' })
  offeringId: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ enum: STATUSES })
  @Column({ type: 'enum', enumName: 'enrollment_status', enum: STATUSES, default: 'enrolled' })
  status: EnrollmentStatus;

  @ApiProperty()
  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;
}
