import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseOffering } from '../courses/entities/course-offering.entity';

export interface LearningSummary {
  activeOfferings: number;
  avgCompletionPercent: number;
  atRiskStudents: number;
}

@Injectable()
export class ReportsService {
  constructor(@InjectRepository(CourseOffering) private readonly offerings: Repository<CourseOffering>) {}

  async learningSummary(): Promise<LearningSummary> {
    const [{ count: activeOfferings }] = await this.offerings.query(
      `SELECT COUNT(*)::int AS count FROM course_offerings WHERE deleted_at IS NULL AND status IN ('scheduled','ongoing')`,
    );

    const [row] = await this.offerings.query(`
      WITH attendance_counts AS (
        SELECT cs.offering_id, ca.user_id, COUNT(*) AS attended
        FROM class_attendance ca
        JOIN course_sessions cs ON cs.id = ca.session_id
        GROUP BY cs.offering_id, ca.user_id
      ),
      enrollment_pct AS (
        SELECT
          COALESCE(ac.attended, 0)::numeric / NULLIF(c.total_sessions, 0) * 100 AS pct,
          c.passing_attendance_percent AS passing
        FROM course_enrollments ce
        JOIN course_offerings co ON co.id = ce.offering_id AND co.deleted_at IS NULL
        JOIN courses c ON c.id = co.course_id
        LEFT JOIN attendance_counts ac ON ac.offering_id = ce.offering_id AND ac.user_id = ce.user_id
        WHERE ce.status IN ('enrolled', 'completed')
      )
      SELECT
        COALESCE(ROUND(AVG(pct)), 0)::int AS avg_completion_percent,
        COUNT(*) FILTER (WHERE pct < passing)::int AS at_risk_students
      FROM enrollment_pct
    `);

    return {
      activeOfferings: Number(activeOfferings),
      avgCompletionPercent: Number(row?.avg_completion_percent ?? 0),
      atRiskStudents: Number(row?.at_risk_students ?? 0),
    };
  }
}
