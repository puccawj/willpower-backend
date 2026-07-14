import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';
import { EventNeedsService } from '../events/event-needs.service';
import { CourseNeedsService } from '../courses/course-needs.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { IssueDonationCertificateDto } from './dto/issue-donation-certificate.dto';
import { Donation } from './entities/donation.entity';

export interface DonationWithLabels extends Donation {
  branchName: string;
  eventTitle: string | null;
  courseTitle: string | null;
  sessionNumber: number | null;
}

export interface PublicDonationRow {
  id: string;
  donorName: string;
  type: string;
  amount: string | null;
  itemDescription: string | null;
  quantity: string | null;
  needTitle: string | null;
  createdAt: Date;
}

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation) private readonly donations: Repository<Donation>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
    private readonly eventNeeds: EventNeedsService,
    private readonly courseNeeds: CourseNeedsService,
  ) {}

  async findAll(actor: AuthUser): Promise<DonationWithLabels[]> {
    const rows = await this.donations.find({ order: { createdAt: 'DESC' } });
    const withLabels = await this.attachLabels(rows);
    if (actor.role === 'superadmin') return withLabels;

    const actorBranchIds = await this.branchIdsOf(actor.id);
    return withLabels.filter((d) => actorBranchIds.has(d.branchId));
  }

  async findOne(id: string, actor: AuthUser): Promise<DonationWithLabels> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');

    if (actor.role !== 'superadmin') {
      const actorBranchIds = await this.branchIdsOf(actor.id);
      if (!actorBranchIds.has(donation.branchId)) throw new NotFoundException('Donation not found.');
    }

    const [withLabels] = await this.attachLabels([donation]);
    return withLabels;
  }

  async create(dto: CreateDonationDto, actorId: string): Promise<Donation> {
    return this.donations.save(this.buildDonation(dto, actorId, null));
  }

  async createSelf(dto: CreateDonationDto, userId: string): Promise<Donation> {
    return this.donations.save(this.buildDonation(dto, userId, userId));
  }

  private buildDonation(dto: CreateDonationDto, actorId: string, userId: string | null): Donation {
    return this.donations.create({
      eventId: dto.eventId ?? null,
      courseId: dto.courseId ?? null,
      branchId: dto.branchId,
      userId,
      donorName: dto.donorName,
      isAnonymous: dto.isAnonymous ?? false,
      donorPhoneCountryCode: dto.donorPhoneCountryCode ?? null,
      donorPhoneNumber: dto.donorPhoneNumber,
      donorEmail: dto.donorEmail,
      type: dto.type,
      proofImageUrl: dto.proofImage ?? null,
      needId: dto.needId ?? null,
      courseNeedId: dto.courseNeedId ?? null,
      quantity: dto.quantity != null ? dto.quantity.toFixed(2) : null,
      createdBy: actorId,
      updatedBy: actorId,
      ...this.parseAmountOrItem(dto.type, dto.amountOrItem),
    });
  }

  async update(id: string, dto: UpdateDonationDto, actorId: string): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');

    if (dto.eventId !== undefined) donation.eventId = dto.eventId ?? null;
    if (dto.courseId !== undefined) donation.courseId = dto.courseId ?? null;
    if (dto.branchId !== undefined) donation.branchId = dto.branchId;
    if (dto.donorName !== undefined) donation.donorName = dto.donorName;
    if (dto.isAnonymous !== undefined) donation.isAnonymous = dto.isAnonymous;
    if (dto.donorPhoneCountryCode !== undefined) donation.donorPhoneCountryCode = dto.donorPhoneCountryCode ?? null;
    if (dto.donorPhoneNumber !== undefined) donation.donorPhoneNumber = dto.donorPhoneNumber;
    if (dto.donorEmail !== undefined) donation.donorEmail = dto.donorEmail;
    if (dto.proofImage !== undefined) donation.proofImageUrl = dto.proofImage;
    if (dto.needId !== undefined) donation.needId = dto.needId ?? null;
    if (dto.courseNeedId !== undefined) donation.courseNeedId = dto.courseNeedId ?? null;
    if (dto.quantity !== undefined) donation.quantity = dto.quantity != null ? dto.quantity.toFixed(2) : null;

    const nextType = dto.type ?? donation.type;
    if (dto.type !== undefined || dto.amountOrItem !== undefined) {
      const amountOrItem = dto.amountOrItem ?? (donation.type === 'money' ? donation.amount! : donation.itemDescription!);
      Object.assign(donation, this.parseAmountOrItem(nextType, amountOrItem));
    }

    donation.updatedBy = actorId;
    return this.donations.save(donation);
  }

  async softDelete(id: string): Promise<void> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');
    await this.donations.softDelete(id);
  }

  async verify(id: string, actorId: string): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');
    if (donation.status === 'verified') return donation;

    donation.status = 'verified';
    donation.verifiedBy = actorId;
    donation.verifiedAt = new Date();
    donation.updatedBy = actorId;
    const saved = await this.donations.save(donation);

    if (saved.needId) {
      const added = saved.type === 'money' ? Number(saved.amount ?? 0) : Number(saved.quantity ?? 0);
      await this.eventNeeds.incrementReceived(saved.needId, added);
    }
    if (saved.courseNeedId) {
      const added = saved.type === 'money' ? Number(saved.amount ?? 0) : Number(saved.quantity ?? 0);
      await this.courseNeeds.incrementReceived(saved.courseNeedId, added);
    }

    return saved;
  }

  async issueCertificate(id: string, dto: IssueDonationCertificateDto, actorId: string): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');
    if (donation.status !== 'verified') {
      throw new ConflictException('Donation must be verified before a certificate can be issued.');
    }
    if (donation.certificateNo) return donation;

    donation.certificateNo = dto.certificateNo;
    donation.certificateTemplateId = dto.templateId;
    donation.certificateUrl = dto.fileUrl;
    donation.certificateIssuedAt = new Date();
    donation.updatedBy = actorId;

    try {
      return await this.donations.save(donation);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('This certificate number was already used — please try again.');
      }
      throw err;
    }
  }

  private parseAmountOrItem(type: string, amountOrItem: string): Partial<Donation> {
    if (type === 'money') {
      const amount = Number(amountOrItem.replace(/[^0-9.]/g, ''));
      if (!amount || amount <= 0) throw new BadRequestException('Please enter a valid donation amount.');
      return { amount: amount.toFixed(2), itemDescription: null };
    }
    return { amount: null, itemDescription: amountOrItem };
  }

  async publicListForEvent(eventId: string): Promise<PublicDonationRow[]> {
    const rows = await this.donations.query(
      `SELECT d.id, d.is_anonymous, d.donor_name, d.type, d.amount, d.item_description, d.quantity,
              d.created_at, n.title AS need_title
         FROM donations d
         LEFT JOIN event_needs n ON n.id = d.need_id
        WHERE d.event_id = $1 AND d.status = 'verified' AND d.deleted_at IS NULL
        ORDER BY d.created_at DESC`,
      [eventId],
    );

    return rows.map((r: any) => ({
      id: r.id,
      donorName: r.is_anonymous ? 'Anonymous' : r.donor_name,
      type: r.type,
      amount: r.amount,
      itemDescription: r.item_description,
      quantity: r.quantity,
      needTitle: r.need_title,
      createdAt: r.created_at,
    }));
  }

  async publicListForCourse(courseId: string): Promise<PublicDonationRow[]> {
    const rows = await this.donations.query(
      `SELECT d.id, d.is_anonymous, d.donor_name, d.type, d.amount, d.item_description, d.quantity,
              d.created_at, n.title AS need_title
         FROM donations d
         LEFT JOIN course_needs n ON n.id = d.course_need_id
        WHERE d.course_id = $1 AND d.status = 'verified' AND d.deleted_at IS NULL
        ORDER BY d.created_at DESC`,
      [courseId],
    );

    return rows.map((r: any) => ({
      id: r.id,
      donorName: r.is_anonymous ? 'Anonymous' : r.donor_name,
      type: r.type,
      amount: r.amount,
      itemDescription: r.item_description,
      quantity: r.quantity,
      needTitle: r.need_title,
      createdAt: r.created_at,
    }));
  }

  private async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  private async attachLabels(rows: Donation[]): Promise<DonationWithLabels[]> {
    if (rows.length === 0) return [];

    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const eventIds = [...new Set(rows.map((r) => r.eventId).filter((id): id is string => !!id))];
    const courseIds = [...new Set(rows.map((r) => r.courseId).filter((id): id is string => !!id))];
    const courseNeedIds = [...new Set(rows.map((r) => r.courseNeedId).filter((id): id is string => !!id))];

    const branchRows = branchIds.length
      ? await this.donations.query(`SELECT id, name FROM branches WHERE id = ANY($1)`, [branchIds])
      : [];
    const eventRows = eventIds.length
      ? await this.donations.query(`SELECT id, title FROM events WHERE id = ANY($1)`, [eventIds])
      : [];
    const courseRows = courseIds.length
      ? await this.donations.query(`SELECT id, title FROM courses WHERE id = ANY($1)`, [courseIds])
      : [];
    const courseNeedRows = courseNeedIds.length
      ? await this.donations.query(`SELECT id, session_number FROM course_needs WHERE id = ANY($1)`, [courseNeedIds])
      : [];

    const branchNameById = new Map<string, string>(branchRows.map((b: any) => [b.id, b.name]));
    const eventTitleById = new Map<string, string>(eventRows.map((e: any) => [e.id, e.title]));
    const courseTitleById = new Map<string, string>(courseRows.map((c: any) => [c.id, c.title]));
    const sessionNumberByNeedId = new Map<string, number | null>(
      courseNeedRows.map((n: any) => [n.id, n.session_number === null ? null : Number(n.session_number)]),
    );

    return rows.map((row) => ({
      ...row,
      branchName: branchNameById.get(row.branchId) ?? '—',
      eventTitle: row.eventId ? eventTitleById.get(row.eventId) ?? '—' : null,
      courseTitle: row.courseId ? courseTitleById.get(row.courseId) ?? '—' : null,
      sessionNumber: row.courseNeedId ? sessionNumberByNeedId.get(row.courseNeedId) ?? null : null,
    }));
  }
}
