import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { Donation } from './entities/donation.entity';

export interface DonationWithLabels extends Donation {
  branchName: string;
  eventTitle: string | null;
}

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation) private readonly donations: Repository<Donation>,
    @InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>,
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
      branchId: dto.branchId,
      userId,
      donorName: dto.donorName,
      isAnonymous: dto.isAnonymous ?? false,
      donorPhoneCountryCode: dto.donorPhoneCountryCode ?? null,
      donorPhoneNumber: dto.donorPhoneNumber,
      donorEmail: dto.donorEmail,
      type: dto.type,
      proofImageUrl: dto.proofImage ?? null,
      createdBy: actorId,
      updatedBy: actorId,
      ...this.parseAmountOrItem(dto.type, dto.amountOrItem),
    });
  }

  async update(id: string, dto: UpdateDonationDto, actorId: string): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');

    if (dto.eventId !== undefined) donation.eventId = dto.eventId ?? null;
    if (dto.branchId !== undefined) donation.branchId = dto.branchId;
    if (dto.donorName !== undefined) donation.donorName = dto.donorName;
    if (dto.isAnonymous !== undefined) donation.isAnonymous = dto.isAnonymous;
    if (dto.donorPhoneCountryCode !== undefined) donation.donorPhoneCountryCode = dto.donorPhoneCountryCode ?? null;
    if (dto.donorPhoneNumber !== undefined) donation.donorPhoneNumber = dto.donorPhoneNumber;
    if (dto.donorEmail !== undefined) donation.donorEmail = dto.donorEmail;
    if (dto.proofImage !== undefined) donation.proofImageUrl = dto.proofImage;

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
    return this.donations.save(donation);
  }

  async issueCertificate(id: string, actorId: string): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found.');
    if (donation.status !== 'verified') {
      throw new ConflictException('Donation must be verified before a certificate can be issued.');
    }

    if (!donation.certificateNo) {
      const year = new Date().getFullYear();
      const branchTag = donation.branchId.slice(0, 2).toUpperCase();
      const random = Math.floor(Math.random() * 9000) + 1000;
      donation.certificateNo = `WPI-${branchTag}-${year}-${random}`;
      donation.certificateIssuedAt = new Date();
      donation.updatedBy = actorId;
      return this.donations.save(donation);
    }

    return donation;
  }

  private parseAmountOrItem(type: string, amountOrItem: string): Partial<Donation> {
    if (type === 'money') {
      const amount = Number(amountOrItem.replace(/[^0-9.]/g, ''));
      if (!amount || amount <= 0) throw new BadRequestException('Please enter a valid donation amount.');
      return { amount: amount.toFixed(2), itemDescription: null };
    }
    return { amount: null, itemDescription: amountOrItem };
  }

  private async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  private async attachLabels(rows: Donation[]): Promise<DonationWithLabels[]> {
    if (rows.length === 0) return [];

    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const eventIds = [...new Set(rows.map((r) => r.eventId).filter((id): id is string => !!id))];

    const branchRows = branchIds.length
      ? await this.donations.query(`SELECT id, name FROM branches WHERE id = ANY($1)`, [branchIds])
      : [];
    const eventRows = eventIds.length
      ? await this.donations.query(`SELECT id, title FROM events WHERE id = ANY($1)`, [eventIds])
      : [];

    const branchNameById = new Map<string, string>(branchRows.map((b: any) => [b.id, b.name]));
    const eventTitleById = new Map<string, string>(eventRows.map((e: any) => [e.id, e.title]));

    return rows.map((row) => ({
      ...row,
      branchName: branchNameById.get(row.branchId) ?? '—',
      eventTitle: row.eventId ? eventTitleById.get(row.eventId) ?? '—' : null,
    }));
  }
}
