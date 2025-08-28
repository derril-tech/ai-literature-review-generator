import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.headers['x-request-id'] = String(requestId);

    const idempotencyKey = req.headers['idempotency-key'] || undefined;
    if (idempotencyKey) {
      req.headers['idempotency-key'] = String(idempotencyKey);
    }
    next();
  }
}

