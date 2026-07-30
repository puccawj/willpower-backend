import { ApiProperty } from '@nestjs/swagger';
import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'course_prerequisites' })
export class CoursePrerequisite {
  @ApiProperty()
  @PrimaryColumn({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ApiProperty()
  @PrimaryColumn({ name: 'prerequisite_course_id', type: 'uuid' })
  prerequisiteCourseId: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
