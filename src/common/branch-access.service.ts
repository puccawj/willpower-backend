import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { UserBranch } from '../users/entities/user-branch.entity';

/**
 * Central helper for "own branch only" scoping: superadmin sees/edits everything;
 * admin and instructor are limited to branches they're assigned to via `user_branches`.
 */
@Injectable()
export class BranchAccessService {
  constructor(@InjectRepository(UserBranch) private readonly userBranches: Repository<UserBranch>) {}

  async branchIdsOf(userId: string): Promise<Set<string>> {
    const links = await this.userBranches.find({ where: { userId } });
    return new Set(links.map((l) => l.branchId));
  }

  async filterByBranch<T extends { branchId: string }>(actor: AuthUser, rows: T[]): Promise<T[]> {
    if (actor.role === 'superadmin') return rows;
    const branchIds = await this.branchIdsOf(actor.id);
    return rows.filter((r) => branchIds.has(r.branchId));
  }

  /** Throws NotFoundException (not Forbidden) so a locked-out actor can't tell the row exists. */
  async assertCanAccess(actor: AuthUser, branchId: string, message = 'Not found.'): Promise<void> {
    if (actor.role === 'superadmin') return;
    const branchIds = await this.branchIdsOf(actor.id);
    if (!branchIds.has(branchId)) throw new NotFoundException(message);
  }
}
