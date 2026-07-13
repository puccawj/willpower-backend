import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EventRsvp } from '../events/entities/event-rsvp.entity';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Donation } from '../donations/entities/donation.entity';
import { AttendanceService } from '../events/attendance.service';
import { EnrollmentService } from '../courses/enrollment.service';
import { DonationsService } from '../donations/donations.service';
import { CreateDonationDto } from '../donations/dto/create-donation.dto';
import { MyRsvpStatus } from './dto/set-my-rsvp.dto';

export interface MyProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  initials: string;
}

export interface MyEventRow {
  eventId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  location: string | null;
  branchName: string;
  startAt: string;
  endAt: string;
  status: string;
  rsvpStatus: string;
  checkedIn: boolean;
}

export interface MyEnrollmentRow {
  offeringId: string;
  courseTitle: string;
  category: string | null;
  branchName: string;
  status: string;
  sessionsTotal: number;
  sessionsAttended: number;
  attendancePercent: number;
  passingPercent: number;
}

export interface MyCertificateRow {
  id: string;
  courseTitle: string | null;
  templateName: string;
  certificateNo: string;
  issuedAt: string;
  fileUrl: string;
}

export interface MyDonationRow {
  id: string;
  createdAt: string;
  type: string;
  amount: string | null;
  itemDescription: string | null;
  currency: string;
  eventTitle: string | null;
  certificateNo: string | null;
}

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EventRsvp) private readonly rsvps: Repository<EventRsvp>,
    @InjectRepository(CourseEnrollment) private readonly enrollments: Repository<CourseEnrollment>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(Donation) private readonly donations: Repository<Donation>,
    private readonly attendance: AttendanceService,
    private readonly enrollment: EnrollmentService,
    private readonly donationsService: DonationsService,
  ) {}

  async profile(userId: string): Promise<MyProfile> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      initials: `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(),
    };
  }

  async myEvents(userId: string): Promise<MyEventRow[]> {
    return this.rsvps.query(
      `SELECT
         e.id AS "eventId",
         e.title,
         e.description,
         e.cover_image_url AS "coverImageUrl",
         e.location,
         b.name AS "branchName",
         e.start_at AS "startAt",
         e.end_at AS "endAt",
         e.status,
         r.status AS "rsvpStatus",
         (a.id IS NOT NULL) AS "checkedIn"
       FROM event_rsvp r
       JOIN events e ON e.id = r.event_id
       JOIN branches b ON b.id = e.branch_id
       LEFT JOIN event_attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
       WHERE r.user_id = $1
       ORDER BY e.start_at ASC`,
      [userId],
    );
  }

  async selfCheckinEvent(userId: string, eventId: string): Promise<{ title: string; alreadyCheckedIn: boolean }> {
    return this.attendance.selfCheckin(eventId, userId);
  }

  async setMyRsvp(userId: string, eventId: string, status: MyRsvpStatus): Promise<void> {
    await this.attendance.setSelfRsvp(eventId, userId, status);
  }

  async myEnrollments(userId: string): Promise<MyEnrollmentRow[]> {
    const rows = await this.enrollments.query(
      `SELECT
         co.id AS "offeringId",
         c.title AS "courseTitle",
         c.category,
         b.name AS "branchName",
         ce.status,
         c.total_sessions AS "sessionsTotal",
         COALESCE((SELECT COUNT(*) FROM class_attendance ca
                    JOIN course_sessions cs ON cs.id = ca.session_id
                    WHERE cs.offering_id = co.id AND ca.user_id = ce.user_id), 0) AS "sessionsAttended",
         c.passing_attendance_percent AS "passingPercent"
       FROM course_enrollments ce
       JOIN course_offerings co ON co.id = ce.offering_id
       JOIN courses c ON c.id = co.course_id
       JOIN branches b ON b.id = co.branch_id
       WHERE ce.user_id = $1
       ORDER BY ce.enrolled_at DESC`,
      [userId],
    );

    return rows.map((r: any) => {
      const sessionsAttended = Number(r.sessionsAttended);
      const sessionsTotal = Number(r.sessionsTotal);
      return {
        offeringId: r.offeringId,
        courseTitle: r.courseTitle,
        category: r.category,
        branchName: r.branchName,
        status: r.status,
        sessionsTotal,
        sessionsAttended,
        attendancePercent: sessionsTotal > 0 ? Math.round((sessionsAttended / sessionsTotal) * 100) : 0,
        passingPercent: Number(r.passingPercent),
      };
    });
  }

  async enrollSelf(userId: string, offeringId: string): Promise<CourseEnrollment> {
    return this.enrollment.enroll(offeringId, { userId });
  }

  async mySessionsFor(userId: string, offeringId: string) {
    return this.enrollment.mySessionsFor(offeringId, userId);
  }

  async selfCheckinSession(userId: string, sessionId: string): Promise<{ title: string; alreadyCheckedIn: boolean }> {
    return this.enrollment.selfCheckinSession(userId, sessionId);
  }

  async donateSelf(userId: string, dto: CreateDonationDto): Promise<Donation> {
    return this.donationsService.createSelf(dto, userId);
  }

  async myCertificates(userId: string): Promise<MyCertificateRow[]> {
    return this.certificates.query(
      `SELECT
         cert.id,
         c.title AS "courseTitle",
         t.name AS "templateName",
         cert.certificate_no AS "certificateNo",
         cert.issued_at AS "issuedAt",
         cert.file_url AS "fileUrl"
       FROM certificates cert
       LEFT JOIN course_offerings co ON co.id = cert.offering_id
       LEFT JOIN courses c ON c.id = co.course_id
       JOIN certificate_templates t ON t.id = cert.template_id
       WHERE cert.user_id = $1
       ORDER BY cert.issued_at DESC`,
      [userId],
    );
  }

  async myDonations(userId: string): Promise<MyDonationRow[]> {
    return this.donations.query(
      `SELECT
         d.id,
         d.created_at AS "createdAt",
         d.type,
         d.amount,
         d.item_description AS "itemDescription",
         d.currency,
         e.title AS "eventTitle",
         d.certificate_no AS "certificateNo"
       FROM donations d
       LEFT JOIN events e ON e.id = d.event_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [userId],
    );
  }
}
