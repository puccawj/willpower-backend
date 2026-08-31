import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StudentApplicationBranchStatus = 'pending' | 'approved' | 'rejected';

/** One row per branch an applicant selected — each branch's admin approves/rejects
 * independently, so a single application can be approved at one branch while still
 * pending (or rejected) at another. */
@Entity({ name: 'student_application_branches' })
export class StudentApplicationBranch {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ApiProperty()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  @Column({ type: 'enum', enumName: 'student_application_status', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: StudentApplicationBranchStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
