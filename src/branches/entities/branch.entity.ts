import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BranchStatus = 'active' | 'inactive' | 'deleted';

@Entity({ name: 'branches' })
export class Branch {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 120 })
  name: string;

  @ApiProperty()
  @Column({ length: 10 })
  code: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @ApiProperty()
  @Column({ length: 80 })
  country: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'phone_country_code', type: 'varchar', length: 5, nullable: true })
  phoneCountryCode: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @ApiProperty()
  @Column({ length: 60 })
  timezone: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ enum: ['active', 'inactive', 'deleted'] })
  @Column({ type: 'enum', enumName: 'branch_status', enum: ['active', 'inactive', 'deleted'], default: 'active' })
  status: BranchStatus;

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
