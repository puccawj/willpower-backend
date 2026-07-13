import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'certificates' })
export class Certificate {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'offering_id', type: 'uuid', nullable: true })
  offeringId: string | null;

  @ApiProperty()
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ApiProperty()
  @Column({ name: 'certificate_no', length: 60 })
  certificateNo: string;

  @ApiProperty()
  @Column({ name: 'attendance_percent', type: 'numeric', precision: 5, scale: 2 })
  attendancePercent: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'issued_by', type: 'uuid', nullable: true })
  issuedBy: string | null;

  @ApiProperty()
  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
