import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateStudentApplicationDto } from './dto/create-student-application.dto';
import { StudentApplication } from './entities/student-application.entity';

@Injectable()
export class StudentApplicationsService {
  constructor(
    @InjectRepository(StudentApplication) private readonly applications: Repository<StudentApplication>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async submit(userId: string, dto: CreateStudentApplicationDto): Promise<StudentApplication> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role !== 'general') {
      throw new BadRequestException('Only general accounts can apply to become a student.');
    }

    const pending = await this.applications.findOne({ where: { userId, status: 'pending' } });
    if (pending) throw new BadRequestException('You already have a pending application.');

    const application = this.applications.create({
      userId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nickname: dto.nickname,
      phone: dto.phone ?? null,
      lineId: dto.lineId ?? null,
      status: 'pending',
    });
    return this.applications.save(application);
  }

  async myLatest(userId: string): Promise<StudentApplication | null> {
    return this.applications.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findAll(status?: string): Promise<StudentApplication[]> {
    return this.applications.find({
      where: status && status !== 'all' ? { status: status as StudentApplication['status'] } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, actorId: string): Promise<StudentApplication> {
    const application = await this.getOrThrow(id);
    if (application.status !== 'pending') throw new BadRequestException('This application has already been reviewed.');

    application.status = 'approved';
    application.reviewedBy = actorId;
    application.reviewedAt = new Date();
    await this.applications.save(application);

    await this.users.update({ id: application.userId }, { role: 'student' });
    return application;
  }

  async reject(id: string, actorId: string): Promise<StudentApplication> {
    const application = await this.getOrThrow(id);
    if (application.status !== 'pending') throw new BadRequestException('This application has already been reviewed.');

    application.status = 'rejected';
    application.reviewedBy = actorId;
    application.reviewedAt = new Date();
    return this.applications.save(application);
  }

  private async getOrThrow(id: string): Promise<StudentApplication> {
    const application = await this.applications.findOne({ where: { id } });
    if (!application) throw new NotFoundException('Application not found.');
    return application;
  }
}
