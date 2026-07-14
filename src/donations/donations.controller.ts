import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { IssueDonationCertificateDto } from './dto/issue-donation-certificate.dto';
import { Donation } from './entities/donation.entity';
import { DonationsService } from './donations.service';

@ApiTags('donations')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin or admin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin', 'admin')
@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get()
  @ApiOperation({ summary: 'List donations. Admins only see donations for their assigned branches.' })
  @ApiOkResponse({ type: Donation, isArray: true })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.donations.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single donation by id.' })
  @ApiOkResponse({ type: Donation })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.donations.findOne(id, actor);
  }

  @Post()
  @ApiOperation({ summary: 'Log a new donation.' })
  @ApiOkResponse({ type: Donation })
  create(@Body() dto: CreateDonationDto, @CurrentUser() actor: AuthUser) {
    return this.donations.create(dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a donation.' })
  @ApiOkResponse({ type: Donation })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateDonationDto, @CurrentUser() actor: AuthUser) {
    return this.donations.update(id, dto, actor.id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Mark a donation as verified.' })
  @ApiOkResponse({ type: Donation })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.donations.verify(id, actor.id);
  }

  @Patch(':id/certificate')
  @ApiOperation({ summary: 'Issue (or re-fetch) the anumodana certificate for a verified donation.' })
  @ApiOkResponse({ type: Donation })
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  issueCertificate(@Param('id') id: string, @Body() dto: IssueDonationCertificateDto, @CurrentUser() actor: AuthUser) {
    return this.donations.issueCertificate(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a donation.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Donation not found.' })
  async remove(@Param('id') id: string) {
    await this.donations.softDelete(id);
  }
}
