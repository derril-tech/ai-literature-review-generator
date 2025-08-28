import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Log significant actions
      if (this.shouldAudit(req)) {
        this.logAction(req, res, duration);
      }
    });

    next();
  }

  private shouldAudit(req: Request): boolean {
    const auditMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    const auditPaths = ['/uploads', '/themes/rebuild', '/exports', '/documents'];
    
    return auditMethods.includes(req.method) || 
           auditPaths.some(path => req.path.startsWith(path));
  }

  private async logAction(req: Request, res: Response, duration: number) {
    try {
      const auditLog = this.auditLogs.create({
        userId: req.headers['x-user-id'] as string || 'anonymous',
        action: `${req.method} ${req.path}`,
        resource: req.path,
        statusCode: res.statusCode,
        duration,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestBody: req.body ? JSON.stringify(req.body) : null,
        responseSize: res.get('content-length') ? parseInt(res.get('content-length')!) : null
      });

      await this.auditLogs.save(auditLog);
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging failed:', error);
    }
  }
}
