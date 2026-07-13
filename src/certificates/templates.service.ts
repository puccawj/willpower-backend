import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CertificateTemplate } from './entities/certificate-template.entity';

export interface TemplateWithBranch extends CertificateTemplate {
  branchName: string | null;
}

@Injectable()
export class TemplatesService {
  constructor(@InjectRepository(CertificateTemplate) private readonly templates: Repository<CertificateTemplate>) {}

  async findAll(): Promise<TemplateWithBranch[]> {
    const rows = await this.templates.find({ order: { createdAt: 'DESC' } });
    return this.attachBranchNames(rows);
  }

  async findOne(id: string): Promise<TemplateWithBranch> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');
    const [withBranch] = await this.attachBranchNames([template]);
    return withBranch;
  }

  async create(dto: CreateTemplateDto, actorId: string): Promise<CertificateTemplate> {
    const template = this.templates.create({
      name: dto.name,
      type: dto.type,
      backgroundImageUrl: dto.backgroundImage,
      year: dto.year ?? null,
      branchId: dto.branchId ?? null,
      layoutConfig: dto.layoutConfig ?? {},
      isActive: false,
      uploadedBy: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const saved = await this.templates.save(template);
    if (dto.isActive) await this.activate(saved.id, actorId);
    return saved;
  }

  async update(id: string, dto: UpdateTemplateDto, actorId: string): Promise<CertificateTemplate> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.type !== undefined) template.type = dto.type;
    if (dto.backgroundImage !== undefined) template.backgroundImageUrl = dto.backgroundImage;
    if (dto.year !== undefined) template.year = dto.year ?? null;
    if (dto.branchId !== undefined) template.branchId = dto.branchId ?? null;
    if (dto.layoutConfig !== undefined) template.layoutConfig = dto.layoutConfig;
    template.updatedBy = actorId;

    const saved = await this.templates.save(template);
    if (dto.isActive !== undefined) {
      if (dto.isActive) await this.activate(saved.id, actorId);
      else await this.deactivate(saved.id, actorId);
    }
    return this.templates.findOne({ where: { id } }) as Promise<CertificateTemplate>;
  }

  async activate(id: string, actorId: string): Promise<void> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');

    // Deactivate any other template sharing this (type, branch) scope — mirrors the DB's
    // "one active template per type+branch" partial unique index (NULL branch = global scope).
    await this.templates.query(
      `UPDATE certificate_templates SET is_active = false, updated_by = $1
       WHERE type = $2 AND COALESCE(branch_id::text, '') = COALESCE($3::text, '') AND id <> $4`,
      [actorId, template.type, template.branchId, id],
    );
    await this.templates.update({ id }, { isActive: true, updatedBy: actorId });
  }

  async deactivate(id: string, actorId: string): Promise<void> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');
    await this.templates.update({ id }, { isActive: false, updatedBy: actorId });
  }

  async remove(id: string): Promise<void> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');
    try {
      await this.templates.delete(id);
    } catch (err: any) {
      if (err?.code === '23503') {
        throw new ConflictException('This template has issued certificates and cannot be deleted.');
      }
      throw err;
    }
  }

  async findActiveCertificateTemplate(branchId: string | null): Promise<CertificateTemplate | null> {
    if (branchId) {
      const scoped = await this.templates.findOne({ where: { type: 'certificate', branchId, isActive: true } });
      if (scoped) return scoped;
    }
    return this.templates.findOne({ where: { type: 'certificate', branchId: IsNull(), isActive: true } });
  }

  private async attachBranchNames(rows: CertificateTemplate[]): Promise<TemplateWithBranch[]> {
    if (rows.length === 0) return [];

    const branchIds = [...new Set(rows.map((r) => r.branchId).filter((id): id is string => !!id))];
    const branchRows = branchIds.length
      ? await this.templates.query(`SELECT id, name FROM branches WHERE id = ANY($1)`, [branchIds])
      : [];
    const branchNameById = new Map<string, string>(branchRows.map((b: any) => [b.id, b.name]));

    return rows.map((row) => ({ ...row, branchName: row.branchId ? branchNameById.get(row.branchId) ?? '—' : null }));
  }
}
