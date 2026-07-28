import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type DevicePlatform = 'ios' | 'android' | 'web';

@Entity({ name: 'user_devices' })
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enumName: 'device_platform', enum: ['ios', 'android', 'web'] })
  platform: DevicePlatform;

  @Column({ name: 'push_token', length: 255 })
  pushToken: string;

  @Column({ name: 'device_model', type: 'varchar', length: 120, nullable: true })
  deviceModel: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 30, nullable: true })
  appVersion: string | null;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
