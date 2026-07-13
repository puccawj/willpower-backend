import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type UserRole = 'superadmin' | 'admin' | 'instructor' | 'student' | 'general';
export type UserStatus = 'active' | 'suspended' | 'pending_verification';
export type RegistrationSource = 'admin' | 'self' | 'google' | 'facebook';

@Entity({ name: 'users' })
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: ['superadmin', 'admin', 'instructor', 'student', 'general'] })
  @Column({ type: 'enum', enumName: 'user_role', enum: ['superadmin', 'admin', 'instructor', 'student', 'general'] })
  role: UserRole;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'primary_branch_id', type: 'uuid', nullable: true })
  primaryBranchId: string | null;

  @ApiProperty()
  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @ApiProperty()
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'phone_country_code', type: 'varchar', length: 5, nullable: true })
  phoneCountryCode: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ enum: ['active', 'suspended', 'pending_verification'] })
  @Column({ type: 'enum', enumName: 'user_status', enum: ['active', 'suspended', 'pending_verification'], default: 'pending_verification' })
  status: UserStatus;

  @ApiProperty({ enum: ['admin', 'self', 'google', 'facebook'], description: 'How this account was created.' })
  @Column({
    name: 'registration_source',
    type: 'enum',
    enumName: 'registration_source',
    enum: ['admin', 'self', 'google', 'facebook'],
    default: 'admin',
  })
  registrationSource: RegistrationSource;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

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
