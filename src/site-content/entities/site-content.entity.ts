import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'site_content' })
export class SiteContent {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ length: 50, unique: true })
  slug: string;

  @ApiProperty()
  @Column({ type: 'jsonb', default: {} })
  content: Record<string, unknown>;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
