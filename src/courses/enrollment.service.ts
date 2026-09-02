import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import type { AuthUser } from '../auth/jwt.strategy';
import { BranchAccessService } from '../common/branch-access.service';
import { ClassAttendance } from './entities/class-attendance.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CourseOffering } from './entities/course-offering.entity';
import { CourseSession } from './entities/course-session.entity';
import { Course } from './entities/course.entity';
import { EnrollDto } from './dto/enroll.dto';

export interface SessionAttendanceCell {
  sessionId: string;
  present: boolean;
}

export interface EnrollmentRow {
  userId: string;
  name: string;
  email: string;
  status: string;
  enrolledAt: Date;
  attendedSessions: number;
  totalSessions: number;
  attendancePercent: number;
  passingPercent: number;
  isPassing: boolean;
  presentThisSession: boolean;
  sessionAttendance: SessionAttendanceCell[];
}

export interface MySessionRow {
  id: string;
  sessionNo: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  checkedIn: boolean;
}

export interface CompletionStatus {
  attendedSessions: number;
  totalSessions: number;
  attendancePercent: number;
  passingPercent: number;
  isPassing: boolean;
}

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseSession) private readonly sessions: Repository<CourseSession>,
    @InjectRepository(CourseEnrollment) private readonly enrollments: Repository<CourseEnrollment>,
    @InjectRepository(ClassAttendance) private readonly attendance: Repository<ClassAttendance>,
    private readonly branchAccess: BranchAccessService,
  ) {}

  async listEnrollments(offeringId: string, sessionId?: string, actor?: AuthUser): Promise<EnrollmentRow[]> {
    const offering = await this.getOfferingOrThrow(offeringId, actor);
    const course = await this.courses.findOne({ where: { id: offering.courseId } });
    const totalSessions = course?.totalSessions ?? 0;
    const passingPercent = Number(course?.passingAttendancePercent ?? 80);

    const rows = await this.enrollments.query(
      `SELECT ce.user_id, u.first_name, u.last_name, u.email, ce.status, ce.enrolled_at,
              COALESCE((SELECT COUNT(*) FROM class_attendance ca
                         JOIN course_sessions cs ON cs.id = ca.session_id
                         WHERE cs.offering_id = $1 AND ca.user_id = ce.user_id), 0) AS attended_sessions,
              ${sessionId ? `EXISTS(SELECT 1 FROM class_attendance ca2 WHERE ca2.session_id = $2 AND ca2.user_id = ce.user_id) AS present_this_session` : 'false AS present_this_session'},
              COALESCE(
                (SELECT JSON_AGG(json_build_object('sessionId', cs2.id, 'present', ca3.id IS NOT NULL) ORDER BY cs2.session_no)
                   FROM course_sessions cs2
                   LEFT JOIN class_attendance ca3 ON ca3.session_id = cs2.id AND ca3.user_id = ce.user_id
                  WHERE cs2.offering_id = $1),
                '[]'
              ) AS session_attendance
         FROM course_enrollments ce
         JOIN users u ON u.id = ce.user_id
        WHERE ce.offering_id = $1
        ORDER BY u.first_name, u.last_name`,
      sessionId ? [offeringId, sessionId] : [offeringId],
    );

    // Same formula as getCompletionStatus()/finalizeCompletion() below — kept in sync rather than
    // calling per-row (which would be an N+1 query against a table already fetched here in bulk).
    return rows.map((r: any) => {
      const attendedSessions = Number(r.attended_sessions);
      const attendancePercent = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 10000) / 100 : 0;
      return {
        userId: r.user_id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        status: r.status,
        enrolledAt: r.enrolled_at,
        attendedSessions,
        totalSessions,
        attendancePercent,
        passingPercent,
        isPassing: attendancePercent >= passingPercent,
        presentThisSession: r.present_this_session,
        sessionAttendance: r.session_attendance,
      };
    });
  }

  async enroll(offeringId: string, dto: EnrollDto, actor?: AuthUser): Promise<CourseEnrollment> {
    const offering = await this.getOfferingOrThrow(offeringId, actor);

    if (offering.status !== 'published') {
      throw new ConflictException(
        offering.status === 'completed'
          ? 'This offering has already ended — enrollment is closed.'
          : 'This offering is not open for enrollment yet.',
      );
    }

    const existing = await this.enrollments.findOne({ where: { offeringId, userId: dto.userId } });
    if (existing) {
      throw new ConflictException(
        actor ? 'This student is already enrolled in this offering.' : "You're already enrolled in this offering.",
      );
    }

    // Capacity only blocks self-service enrollment — an admin/instructor adding someone directly
    // (e.g. a walk-in exception) can go over, same as the prerequisite override below.
    if (!actor && offering.capacity != null) {
      const enrolledCount = await this.enrollments.count({ where: { offeringId, status: 'enrolled' } });
      if (enrolledCount >= offering.capacity) {
        throw new ConflictException('This offering is at capacity.');
      }
    }

    // Prerequisite courses are enforced for every enrollment path — self-service and
    // admin-driven alike. An admin/instructor can explicitly override with dto.force
    // (surfaced as a checkbox in the admin UI), which self-service callers never set.
    const missing = await this.missingPrerequisiteTitles(offering.courseId, dto.userId);
    if (missing.length && !(actor && dto.force)) {
      throw new BadRequestException(
        `${actor ? 'This student has' : 'You have'} not completed ${missing.join(', ')} yet, required before enrolling in this course.`,
      );
    }

    const enrollment = this.enrollments.create({ offeringId, userId: dto.userId, status: 'enrolled' });
    return this.enrollments.save(enrollment);
  }

  /**
   * Single source of truth for attendance %/pass status — CertificatesService calls this instead
   * of independently recomputing, so the two never disagree.
   */
  async getCompletionStatus(offeringId: string, userId: string): Promise<CompletionStatus> {
    const offering = await this.getOfferingOrThrow(offeringId);
    const course = await this.courses.findOne({ where: { id: offering.courseId } });
    const totalSessions = course?.totalSessions ?? 0;
    const passingPercent = Number(course?.passingAttendancePercent ?? 80);

    const [{ attended }] = await this.enrollments.query(
      `SELECT COUNT(*) AS attended FROM class_attendance ca
        JOIN course_sessions cs ON cs.id = ca.session_id
       WHERE cs.offering_id = $1 AND ca.user_id = $2`,
      [offeringId, userId],
    );
    const attendedSessions = Number(attended);
    const attendancePercent = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 10000) / 100 : 0;

    return {
      attendedSessions,
      totalSessions,
      attendancePercent,
      passingPercent,
      isPassing: attendancePercent >= passingPercent,
    };
  }

  /**
   * Computes completion status and persists it onto the enrollment's status (completed/failed)
   * — previously that enum value was never written by anything. Idempotent and a no-op on
   * enrollments already in a terminal/non-'enrolled' state (dropped/waitlist), so it never
   * overwrites a manual admin decision.
   *
   * A 'completed' outcome is recorded as soon as attendance-to-date meets the passing bar, even
   * mid-course — attendedSessions only ever increases and totalSessions is fixed per course once
   * published, so once the percentage crosses the passing threshold it cannot later drop back
   * below it; there's nothing to gain by waiting for the offering to end. A 'failed' outcome, by
   * contrast, can still be salvaged by attending more sessions, so it's only ever recorded once
   * the offering has genuinely ended and no sessions remain.
   */
  async finalizeCompletion(offeringId: string, userId: string): Promise<CompletionStatus> {
    const offering = await this.getOfferingOrThrow(offeringId);
    const status = await this.getCompletionStatus(offeringId, userId);

    const offeringEnded = new Date() >= new Date(offering.endDate);
    if (status.isPassing || offeringEnded) {
      const enrollment = await this.enrollments.findOne({ where: { offeringId, userId } });
      if (enrollment && enrollment.status === 'enrolled') {
        enrollment.status = status.isPassing ? 'completed' : 'failed';
        await this.enrollments.save(enrollment);
      }
    }

    return status;
  }

  /**
   * Finalizes completion status for every still-'enrolled' row on an offering that has already
   * ended, without waiting for an admin to issue that student's certificate first — previously
   * `finalizeCompletion()` only ever ran as a side effect of certificate issuance, so a student
   * who genuinely finished a course but was never issued a certificate (forgotten, or no
   * template configured yet) stayed stuck at status 'enrolled' forever, permanently failing the
   * prerequisite check for any course that requires it. Called by the offering auto-complete
   * sweep (`OfferingsService.autoCompleteExpiredOfferings`).
   */
  async finalizeAllForEndedOfferings(): Promise<number> {
    const rows: { offering_id: string; user_id: string }[] = await this.enrollments.query(
      `SELECT ce.offering_id, ce.user_id
         FROM course_enrollments ce
         JOIN course_offerings co ON co.id = ce.offering_id
        WHERE ce.status = 'enrolled' AND co.end_date < CURRENT_DATE`,
    );
    for (const r of rows) {
      await this.finalizeCompletion(r.offering_id, r.user_id);
    }
    return rows.length;
  }

  /** Course titles the user has not yet completed among the target course's prerequisites. */
  private async missingPrerequisiteTitles(courseId: string, userId: string): Promise<string[]> {
    const rows = await this.enrollments.query(
      `SELECT c.title
       FROM course_prerequisites cp
       JOIN courses c ON c.id = cp.prerequisite_course_id
       WHERE cp.course_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM course_enrollments ce
           JOIN course_offerings co ON co.id = ce.offering_id
           WHERE co.course_id = cp.prerequisite_course_id
             AND ce.user_id = $2
             AND ce.status = 'completed'
         )`,
      [courseId, userId],
    );
    return rows.map((r: { title: string }) => r.title);
  }

  async removeEnrollment(offeringId: string, userId: string, actor?: AuthUser): Promise<void> {
    const offering = await this.getOfferingOrThrow(offeringId, actor);
    if (offering.status === 'completed') {
      throw new ConflictException('This offering is completed — its roster can no longer be changed.');
    }
    const enrollment = await this.enrollments.findOne({ where: { offeringId, userId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found.');
    await this.enrollments.delete({ offeringId, userId });
  }

  async toggleAttendance(sessionId: string, userId: string, actorId: string, actor?: AuthUser): Promise<{ checkedIn: boolean }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');
    const offering = await this.getOfferingOrThrow(session.offeringId, actor);
    if (offering.status === 'completed') {
      throw new ConflictException('This offering is completed — attendance can no longer be changed.');
    }

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
    await this.finalizeCompletion(session.offeringId, userId);
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

  async getSessionCheckinQr(sessionId: string, actor?: AuthUser): Promise<{ code: string; qrDataUrl: string }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');
    if (actor) await this.getOfferingOrThrow(session.offeringId, actor);

    const qrDataUrl = await QRCode.toDataURL(sessionId, { margin: 1, width: 320 });
    return { code: sessionId, qrDataUrl };
  }

  async selfCheckinSession(userId: string, sessionId: string): Promise<{ title: string; alreadyCheckedIn: boolean }> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found.');

    const offering = await this.getOfferingOrThrow(session.offeringId);
    if (offering.status === 'completed') {
      throw new ConflictException('This offering is completed — check-in is closed.');
    }

    const enrollment = await this.enrollments.findOne({ where: { offeringId: session.offeringId, userId } });
    if (!enrollment || enrollment.status !== 'enrolled') {
      throw new ConflictException('You need an active enrollment in this course to check in.');
    }

    const existing = await this.attendance.findOne({ where: { sessionId, userId } });
    if (existing) return { title: `Session ${session.sessionNo}`, alreadyCheckedIn: true };

    await this.attendance.save(
      this.attendance.create({ sessionId, userId, checkedInBy: userId, method: 'self_qr' }),
    );
    await this.finalizeCompletion(session.offeringId, userId);
    return { title: `Session ${session.sessionNo}`, alreadyCheckedIn: false };
  }

  private async getOfferingOrThrow(offeringId: string, actor?: AuthUser): Promise<CourseOffering> {
    const offering = await this.offerings.findOne({ where: { id: offeringId } });
    if (!offering) throw new NotFoundException('Offering not found.');
    if (actor?.role === 'instructor' && offering.instructorId !== actor.id) {
      throw new NotFoundException('Offering not found.');
    }
    if (actor) await this.branchAccess.assertCanAccess(actor, offering.branchId, 'Offering not found.');
    return offering;
  }
}
