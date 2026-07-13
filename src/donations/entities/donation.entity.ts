import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DonationType = 'money' | 'goods';
export type DonationStatus = 'pending' | 'received' | 'verified' | 'rejected';

const TYPES: DonationType[] = ['money', 'goods'];
const STATUSES: DonationStatus[] = ['pending', 'received', 'verified', 'rejected'];

@Entity({ name: 'donations' })
export class Donation {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty()
  @Column({ name: 'donor_name', length: 150 })
  donorName: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'donor_phone_country_code', type: 'varchar', length: 5, nullable: true })
  donorPhoneCountryCode: string | null;

  @ApiProperty()
  @Column({ name: 'donor_phone_number', length: 30 })
  donorPhoneNumber: string;

  @ApiProperty()
  @Column({ name: 'donor_email', length: 255 })
  donorEmail: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'receipt_number', type: 'varchar', length: 60, nullable: true })
  receiptNumber: string | null;

  @ApiProperty({ enum: TYPES })
  @Column({ type: 'enum', enumName: 'donation_type', enum: TYPES })
  type: DonationType;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  amount: string | null;

  @ApiProperty()
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'item_description', type: 'text', nullable: true })
  itemDescription: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'proof_image_url', type: 'text', nullable: true })
  proofImageUrl: string | null;

  @ApiProperty({ enum: STATUSES })
  @Column({ type: 'enum', enumName: 'donation_status', enum: STATUSES, default: 'pending' })
  status: DonationStatus;

  @ApiProperty()
  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'certificate_no', type: 'varchar', length: 60, nullable: true })
  certificateNo: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'certificate_issued_at', type: 'timestamptz', nullable: true })
  certificateIssuedAt: Date | null;

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
