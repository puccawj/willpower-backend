import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'course_sessions' })
export class CourseSession {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'offering_id', type: 'uuid' })
  offeringId: string;

  @ApiProperty()
  @Column({ name: 'session_no', type: 'int' })
  sessionNo: number;

  @ApiProperty()
  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string;

  @ApiProperty()
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @ApiProperty()
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string | null;

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
}
