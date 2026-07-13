import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { ClassAttendance } from './entities/class-attendance.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CourseOffering } from './entities/course-offering.entity';
import { CourseSession } from './entities/course-session.entity';
import { Course } from './entities/course.entity';
import { EnrollDto } from './dto/enroll.dto';

export interface EnrollmentRow {
  userId: string;
  name: string;
  email: string;
  status: string;
  enrolledAt: Date;
  attendedSessions: number;
  totalSessions: number;
  attendancePercent: number;
  presentThisSession: boolean;
}

export interface MySessionRow {
  id: string;
  sessionNo: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  checkedIn: boolean;
}

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseSession) private readonly sessions: Repository<CourseSession>,
    @InjectRepository(CourseEnrollment) private readonly enrollments: Repository<CourseEnrollment>,
    @InjectRepository(ClassAttendance) private readonly attendance: Repository<ClassAttendance>,
  ) {}

  async listEnrollments(offeringId: string, sessionId?: string): Promise<EnrollmentRow[]> {
    const offering = await this.getOfferingOrThrow(offeringId);
    const course = await this.courses.findOne({ where: { id: offering.courseId } });
    const totalSessions = course?.totalSessions ?? 0;

    const rows = await this.enrollments.query(
      `SELECT ce.user_id, u.first_name, u.last_name, u.email, ce.status, ce.enrolled_at,
              COALESCE((SELECT COUNT(*) FROM class_attendance ca
                         JOIN course_sessions cs ON cs.id = ca.session_id
                         WHERE cs.offering_id = $1 AND ca.user_id = ce.user_id), 0) AS attended_sessions,
              ${sessionId ? `EXISTS(SELECT 1 FROM class_attendance ca2 WHERE ca2.session_id = $2 AND ca2.user_id = ce.user_id) AS present_this_session` : 'false AS present_this_session'}
         FROM course_enrollments ce
         JOIN users u ON u.id = ce.user_id
        WHERE ce.offering_id = $1
        ORDER BY u.first_name, u.last_name`,
      sessionId ? [offeringId, sessionId] : [offeringId],
    );

    return rows.map((r: any) => ({
      userId: r.user_id,
      name: `${r.first_name} ${r.last_name}`,
      email: r.email,
      status: r.status,
      enrolledAt: r.enrolled_at,
      attendedSessions: Number(r.attended_sessions),
      totalSessions,
      attendancePercent: totalSessions > 0 ? Math.round((Number(r.attended_sessions) / totalSessions) * 100) : 0,
      presentThisSession: r.present_this_session,
    }));
  }

  async enroll(offeringId: string, dto: EnrollDto): Promise<CourseEnrollment> {
    await this.getOfferingOrThrow(offeringId);

    const existing = await this.enrollments.findOne({ where: { offeringId, userId: dto.userId } });
    if (existing) throw new ConflictException('This user is already enrolled in this offering.');

    const enrollment = this.enrollments.create({ offeringId, userId: dto.userId, status: 'enrolled' });
    return this.enrollments.save(enrollment);
  }

  async removeEnrollment(offeringId: string, userId: string): Promise<void> {
    const enrollment = await this.enrollments.findOne({ where: { offeringId, userId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found.');
    await this.enrollments.delete({ offeringId, userId });
  }

  async toggleAttendance(sessionId: string, userId: string, actorId: string): Promise<{ checkedIn: boolean }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');

    const enrolled = await this.enrollments.findOne({ where: { offeringId: session.offeringId, userId } });
    if (!enrolled) throw new NotFoundException('This user is not enrolled in this offering.');

    const existing = await this.attendance.findOne({ where: { sessionId, userId } });
    if (existing) {
      await this.attendance.delete({ sessionId, userId });
      return { checkedIn: false };
    }

    await this.attendance.save(
      this.attendance.create({ sessionId, userId, checkedInBy: actorId, method: 'manual' }),
    );
    return { checkedIn: true };
  }

  async mySessionsFor(offeringId: string, userId: string): Promise<MySessionRow[]> {
    const enrollment = await this.enrollments.findOne({ where: { offeringId, userId } });
    if (!enrollment) throw new NotFoundException('You are not enrolled in this offering.');

    const rows = await this.sessions.query(
      `SELECT cs.id, cs.session_no AS "sessionNo", cs.session_date::text AS "sessionDate",
              cs.start_time::text AS "startTime", cs.end_time::text AS "endTime",
              (ca.id IS NOT NULL) AS "checkedIn"
         FROM course_sessions cs
         LEFT JOIN class_attendance ca ON ca.session_id = cs.id AND ca.user_id = $2
        WHERE cs.offering_id = $1
        ORDER BY cs.session_no ASC`,
      [offeringId, userId],
    );
    return rows;
  }

  async getSessionCheckinQr(sessionId: string): Promise<{ code: string; qrDataUrl: string }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');

    const qrDataUrl = await QRCode.toDataURL(sessionId, { margin: 1, width: 320 });
    return { code: sessionId, qrDataUrl };
  }

  async selfCheckinSession(userId: string, sessionId: string): Promise<{ title: string; alreadyCheckedIn: boolean }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');

    const enrollment = await this.enrollments.findOne({ where: { offeringId: session.offeringId, userId } });
    if (!enrollment || enrollment.status !== 'enrolled') {
      throw new ConflictException('You need an active enrollment in this course to check in.');
    }

    const existing = await this.attendance.findOne({ where: { sessionId, userId } });
    if (existing) return { title: `Session ${session.sessionNo}`, alreadyCheckedIn: true };

    await this.attendance.save(
      this.attendance.create({ sessionId, userId, checkedInBy: userId, method: 'self_qr' }),
    );
    return { title: `Session ${session.sessionNo}`, alreadyCheckedIn: false };
  }

  private async getOfferingOrThrow(offeringId: string): Promise<CourseOffering> {
    const offering = await this.offerings.findOne({ where: { id: offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');
    return offering;
  }
}
