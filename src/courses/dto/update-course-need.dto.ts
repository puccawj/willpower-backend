import { PartialType } from '@nestjs/swagger';
import { CreateCourseNeedDto } from './create-course-need.dto';

export class UpdateCourseNeedDto extends PartialType(CreateCourseNeedDto) {}
