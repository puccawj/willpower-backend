import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CheckinMethod = 'self_qr' | 'staff_qr' | 'manual';

const METHODS: CheckinMethod[] = ['self_qr', 'staff_qr', 'manual'];

@Entity({ name: 'class_attendance' })
export class ClassAttendance {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty()
  @Column({ name: 'checked_in_at', type: 'timestamptz', default: () => 'now()' })
  checkedInAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'checked_in_by', type: 'uuid', nullable: true })
  checkedInBy: string | null;

  @ApiProperty({ enum: METHODS })
  @Column({ type: 'enum', enumName: 'checkin_method', enum: METHODS })
  method: CheckinMethod;
}
