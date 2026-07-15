import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateNumberCounter } from './entities/certificate-number-counter.entity';

@Injectable()
export class CertificateNumberingService {
  constructor(
    @InjectRepository(CertificateNumberCounter) private readonly counters: Repository<CertificateNumberCounter>,
  ) {}

  /** Atomically reserves the next sequential number for `prefix` in the current year and formats it, e.g. WPI-CERT-2026-0001. */
  async reserveNext(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const [{ next_number }] = await this.counters.query(
      `INSERT INTO certificate_number_counters (prefix, year, next_number)
       VALUES ($1, $2, 2)
       ON CONFLICT (prefix, year) DO UPDATE SET next_number = certificate_number_counters.next_number + 1
       RETURNING next_number - 1 AS next_number`,
      [prefix, year],
    );
    return `${prefix}-${year}-${String(next_number).padStart(4, '0')}`;
  }
}
