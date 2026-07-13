import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type RsvpStatus = 'confirm' | 'maybe' | 'cancel';

@Entity({ name: 'event_rsvp' })
export class EventRsvp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enumName: 'rsvp_status', enum: ['confirm', 'maybe', 'cancel'] })
  status: RsvpStatus;

  @CreateDateColumn({ name: 'responded_at' })
  respondedAt: Date;
}
