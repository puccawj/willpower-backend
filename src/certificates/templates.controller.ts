import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { TemplatesService } from './templates.service';

@ApiTags('certificate-templates')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Requires the superadmin role.' })
@UseGuards(RolesGuard)
@Roles('superadmin')
@Controller('certificate-templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all certificate templates.' })
  @ApiOkResponse({ type: CertificateTemplate, isArray: true })
  findAll() {
    return this.templates.findAll();
  }

  @Get('active/lookup')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Find the active certificate template for a branch (falls back to the global template).' })
  findActiveForBranch(@Query('branchId') branchId?: string) {
    return this.templates.findActiveCertificateTemplate(branchId ?? null);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template by id.' })
  @ApiOkResponse({ type: CertificateTemplate })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a new certificate template.' })
  @ApiOkResponse({ type: CertificateTemplate })
  create(@Body() dto: CreateTemplateDto, @CurrentUser() actor: AuthUser) {
    return this.templates.create(dto, actor.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a certificate template.' })
  @ApiOkResponse({ type: CertificateTemplate })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() actor: AuthUser) {
    return this.templates.update(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a certificate template.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Template not found.' })
  async remove(@Param('id') id: string) {
    await this.templates.remove(id);
  }
}
