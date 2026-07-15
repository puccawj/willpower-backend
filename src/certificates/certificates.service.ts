import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { CourseOffering } from '../courses/entities/course-offering.entity';
import { Course } from '../courses/entities/course.entity';
import { CertificateNumberingService } from './certificate-numbering.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { Certificate } from './entities/certificate.entity';
import { TemplatesService } from './templates.service';

export interface CertificateRow extends Certificate {
  studentName: string;
  studentEmail: string;
}

const NUMBER_PREFIX = 'WPI-CERT';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseEnrollment) private readonly enrollments: Repository<CourseEnrollment>,
    private readonly templatesService: TemplatesService,
    private readonly numbering: CertificateNumberingService,
  ) {}

  reserveNextNumber(): Promise<string> {
    return this.numbering.reserveNext(NUMBER_PREFIX);
  }

  async findAll(offeringId?: string): Promise<CertificateRow[]> {
    const rows: any[] = await this.certificates.query(
      offeringId
        ? `SELECT c.*, u.first_name, u.last_name, u.email
             FROM certificates c JOIN users u ON u.id = c.user_id
            WHERE c.offering_id = $1 AND c.voided_at IS NULL
            ORDER BY c.issued_at DESC`
        : `SELECT c.*, u.first_name, u.last_name, u.email
             FROM certificates c JOIN users u ON u.id = c.user_id
            WHERE c.voided_at IS NULL
            ORDER BY c.issued_at DESC`,
      offeringId ? [offeringId] : [],
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      offeringId: r.offering_id,
      templateId: r.template_id,
      certificateNo: r.certificate_no,
      attendancePercent: r.attendance_percent,
      issuedAt: r.issued_at,
      issuedBy: r.issued_by,
      fileUrl: r.file_url,
      voidedAt: r.voided_at,
      voidedBy: r.voided_by,
      createdAt: r.created_at,
      studentName: `${r.first_name} ${r.last_name}`,
      studentEmail: r.email,
    }));
  }

  async issue(dto: IssueCertificateDto, actorId: string): Promise<Certificate> {
    const offering = await this.offerings.findOne({ where: { id: dto.offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');

    const enrollment = await this.enrollments.findOne({ where: { offeringId: dto.offeringId, userId: dto.userId } });
    if (!enrollment) throw new BadRequestException('This student is not enrolled in this offering.');

    const existing = await this.certificates.findOne({
      where: { offeringId: dto.offeringId, userId: dto.userId, voidedAt: IsNull() },
    });
    if (existing) throw new ConflictException('A certificate has already been issued for this student.');

    const course = await this.courses.findOne({ where: { id: offering.courseId } });
    if (!course) throw new NotFoundException('Course not found.');

    const [{ attended_sessions }] = await this.certificates.query(
      `SELECT COUNT(*) AS attended_sessions FROM class_attendance ca
        JOIN course_sessions cs ON cs.id = ca.session_id
       WHERE cs.offering_id = $1 AND ca.user_id = $2`,
      [dto.offeringId, dto.userId],
    );
    const attendancePercent =
      course.totalSessions > 0 ? Math.round((Number(attended_sessions) / course.totalSessions) * 10000) / 100 : 0;

    if (attendancePercent < Number(course.passingAttendancePercent)) {
      throw new ConflictException(
        `Student has ${attendancePercent}% attendance, below the ${course.passingAttendancePercent}% required to pass.`,
      );
    }

    const template = await this.templatesService.findActiveCertificateTemplate(offering.branchId);
    if (!template) throw new BadRequestException('No active certificate template is configured for this branch.');

    const certificate = this.certificates.create({
      userId: dto.userId,
      offeringId: dto.offeringId,
      templateId: template.id,
      certificateNo: dto.certificateNo,
      attendancePercent: attendancePercent.toFixed(2),
      issuedBy: actorId,
      fileUrl: dto.fileUrl,
    });
    try {
      return await this.certificates.save(certificate);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('This certificate number was already used — please try again.');
      }
      throw err;
    }
  }

  async voidCertificate(id: string, actorId: string): Promise<void> {
    const certificate = await this.certificates.findOne({ where: { id } });
    if (!certificate) throw new NotFoundException('Certificate not found.');
    if (certificate.voidedAt) return;

    certificate.voidedAt = new Date();
    certificate.voidedBy = actorId;
    await this.certificates.save(certificate);
  }
}
