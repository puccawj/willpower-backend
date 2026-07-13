import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CheckinMethod = 'self_qr' | 'staff_qr' | 'manual';

@Entity({ name: 'event_attendance' })
export class EventAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'checked_in_at', type: 'timestamptz' })
  checkedInAt: Date;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt: Date | null;

  @Column({ name: 'checked_in_by', type: 'uuid', nullable: true })
  checkedInBy: string | null;

  @Column({ type: 'enum', enumName: 'checkin_method', enum: ['self_qr', 'staff_qr', 'manual'] })
  method: CheckinMethod;
}
