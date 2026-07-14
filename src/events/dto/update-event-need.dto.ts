import { PartialType } from '@nestjs/swagger';
import { CreateEventNeedDto } from './create-event-need.dto';

export class UpdateEventNeedDto extends PartialType(CreateEventNeedDto) {}
