import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';

class CreateDocumentDto {
  projectId!: string;
  hash!: string;
  title?: string;
  doi?: string;
  s3PdfKey?: string;
}

@Controller('documents')
export class DocumentsController {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>
  ) {}

  @Post()
  async create(@Body() dto: CreateDocumentDto) {
    const existing = await this.documents.findOne({ where: { hash: dto.hash } });
    if (existing) return existing;
    const doc = this.documents.create({
      project: { id: dto.projectId } as any,
      hash: dto.hash,
      title: dto.title ?? null,
      doi: dto.doi ?? null,
      s3PdfKey: dto.s3PdfKey ?? null,
      status: 'uploaded'
    });
    return await this.documents.save(doc);
  }

  @Get()
  async list(
    @Query('projectId') projectId?: string,
    @Query('query') query?: string,
    @Query('year') year?: string,
    @Query('venue') venue?: string
  ) {
    const where: any = {};
    if (projectId) where.project = { id: projectId };
    if (year) where.year = Number(year);
    if (venue) where.venue = venue;

    // naive full-text filter on title for now
    const docs = await this.documents.find({ where, take: 100, order: { createdAt: 'DESC' } });
    if (query) {
      const q = query.toLowerCase();
      return docs.filter((d) => (d.title ?? '').toLowerCase().includes(q));
    }
    return docs;
  }
}

