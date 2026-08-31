import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'student_applications' })
export class StudentApplication {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty()
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @ApiProperty()
  @Column({ name: 'nickname', type: 'varchar', length: 100 })
  nickname: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'line_id', type: 'varchar', length: 100, nullable: true })
  lineId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
