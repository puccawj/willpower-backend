import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'home_banners' })
export class HomeBanner {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'link_url', type: 'text', nullable: true })
  linkUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Null means "no end date" — the banner keeps showing indefinitely.' })
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @ApiProperty()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
