import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TemplateType = 'certificate' | 'donation_money' | 'donation_goods';

const TYPES: TemplateType[] = ['certificate', 'donation_money', 'donation_goods'];

@Entity({ name: 'certificate_templates' })
export class CertificateTemplate {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 150 })
  name: string;

  @ApiProperty({ enum: TYPES })
  @Column({ type: 'enum', enumName: 'template_type', enum: TYPES })
  type: TemplateType;

  @ApiProperty()
  @Column({ name: 'background_image_url', type: 'text' })
  backgroundImageUrl: string;

  @ApiProperty()
  @Column({ name: 'layout_config', type: 'jsonb', default: {} })
  layoutConfig: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @ApiProperty()
  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

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
