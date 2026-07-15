import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'certificate_number_counters' })
export class CertificateNumberCounter {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  prefix: string;

  @PrimaryColumn({ type: 'int' })
  year: number;

  @Column({ name: 'next_number', type: 'int', default: 1 })
  nextNumber: number;
}
