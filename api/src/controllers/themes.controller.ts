import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../entities/theme.entity';
import { NatsService } from '../services/nats.service';
import { Document } from '../entities/document.entity';

class RebuildDto {
  projectId!: string;
}

class SummarizeDto {
  themeId!: string;
}

class BundleDto {
  themeId!: string;
  projectId!: string;
  k?: number;
}

@Controller('themes')
export class ThemesController {
  constructor(
    @InjectRepository(Theme)
    private readonly themes: Repository<Theme>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly nats: NatsService
  ) {}

  @Get()
  async list(@Query('projectId') projectId: string) {
    return this.themes.find({ where: { project: { id: projectId } }, take: 500 });
  }

  @Post('rebuild')
  async rebuild(@Body() dto: RebuildDto) {
    await this.nats.publish('embed.upsert', { projectId: dto.projectId });
    await this.nats.publish('cluster.run', { projectId: dto.projectId });
    await this.nats.publish('label.run', { projectId: dto.projectId });
    return { accepted: true, projectId: dto.projectId };
  }

  @Get(':id')
  async details(@Param('id') id: string) {
    const theme = await this.themes.findOne({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    const rows = await this.documents.query(
      'SELECT d.id, d.title, ta.weight FROM theme_assignments ta JOIN documents d ON d.id = ta."documentId" WHERE ta."themeId" = $1 ORDER BY ta.weight DESC LIMIT 10',
      [id]
    );
    return { theme, topPapers: rows };
  }

  @Post(':id/summarize')
  async summarize(@Param('id') id: string, @Body() dto: SummarizeDto) {
    const theme = await this.themes.findOne({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    
    await this.nats.publish('summary.make', { themeId: id });
    return { accepted: true, themeId: id };
  }

  @Post('bundles/citations')
  async createBundle(@Body() dto: BundleDto) {
    await this.nats.publish('bundle.make', { 
      themeId: dto.themeId, 
      projectId: dto.projectId, 
      k: dto.k || 10 
    });
    return { accepted: true, themeId: dto.themeId };
  }
}
