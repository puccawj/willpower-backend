import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';

export interface RegistryRow {
  certificateNo: string;
  recipientName: string;
  recipientEmail: string;
  type: 'course' | 'donation';
  detail: string;
  issuedAt: Date;
  issuedByName: string | null;
  status: 'issued' | 'voided';
  voidedAt: Date | null;
}

@Injectable()
export class RegistryService {
  constructor(@InjectRepository(Certificate) private readonly certificates: Repository<Certificate>) {}

  async findAll(): Promise<RegistryRow[]> {
    const rows: any[] = await this.certificates.query(`
      SELECT
        c.certificate_no,
        u.first_name || ' ' || u.last_name AS recipient_name,
        u.email AS recipient_email,
        'course' AS type,
        co.title AS detail,
        c.issued_at,
        ib.first_name || ' ' || ib.last_name AS issued_by_name,
        CASE WHEN c.voided_at IS NULL THEN 'issued' ELSE 'voided' END AS status,
        c.voided_at
      FROM certificates c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN course_offerings cof ON cof.id = c.offering_id
      LEFT JOIN courses co ON co.id = cof.course_id
      LEFT JOIN users ib ON ib.id = c.issued_by

      UNION ALL

      SELECT
        dc.certificate_no,
        d.donor_name AS recipient_name,
        d.donor_email AS recipient_email,
        'donation' AS type,
        COALESCE(e.title, cr.title, 'General fund') AS detail,
        dc.issued_at,
        ib.first_name || ' ' || ib.last_name AS issued_by_name,
        CASE WHEN dc.voided_at IS NULL THEN 'issued' ELSE 'voided' END AS status,
        dc.voided_at
      FROM donation_certificates dc
      JOIN donations d ON d.id = dc.donation_id
      LEFT JOIN events e ON e.id = d.event_id
      LEFT JOIN courses cr ON cr.id = d.course_id
      LEFT JOIN users ib ON ib.id = dc.issued_by

      ORDER BY issued_at DESC
    `);

    return rows.map((r) => ({
      certificateNo: r.certificate_no,
      recipientName: r.recipient_name,
      recipientEmail: r.recipient_email,
      type: r.type,
      detail: r.detail,
      issuedAt: r.issued_at,
      issuedByName: r.issued_by_name,
      status: r.status,
      voidedAt: r.voided_at,
    }));
  }
}
