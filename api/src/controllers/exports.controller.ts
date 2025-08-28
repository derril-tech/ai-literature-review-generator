import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Export } from '../entities/export.entity';
import { NatsService } from '../services/nats.service';

class CreateExportDto {
  projectId!: string;
  type!: 'docx' | 'json';
}

@Controller('exports')
export class ExportsController {
  constructor(
    @InjectRepository(Export)
    private readonly exports: Repository<Export>,
    private readonly nats: NatsService
  ) {}

  @Post('review')
  async createReview(@Body() dto: CreateExportDto) {
    await this.nats.publish('export.make', { 
      projectId: dto.projectId, 
      type: 'docx' 
    });
    return { accepted: true, projectId: dto.projectId, type: 'docx' };
  }

  @Post('json')
  async createJson(@Body() dto: CreateExportDto) {
    await this.nats.publish('export.make', { 
      projectId: dto.projectId, 
      type: 'json' 
    });
    return { accepted: true, projectId: dto.projectId, type: 'json' };
  }

  @Get()
  async list(@Query('projectId') projectId: string) {
    return this.exports.find({ 
      where: { project: { id: projectId } }, 
      order: { createdAt: 'DESC' },
      take: 50 
    });
  }

  @Get(':id')
  async details(@Param('id') id: string) {
    const exportRecord = await this.exports.findOne({ where: { id } });
    if (!exportRecord) throw new NotFoundException('Export not found');
    return exportRecord;
  }
}
