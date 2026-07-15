import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'donation_certificates' })
export class DonationCertificate {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'donation_id', type: 'uuid' })
  donationId: string;

  @ApiProperty()
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ApiProperty()
  @Column({ name: 'certificate_no', length: 60 })
  certificateNo: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'issued_by', type: 'uuid', nullable: true })
  issuedBy: string | null;

  @ApiProperty()
  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'voided_by', type: 'uuid', nullable: true })
  voidedBy: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
