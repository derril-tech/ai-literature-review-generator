import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private nc?: NatsConnection;
  private sc = StringCodec();

  async onModuleInit() {
    const url = process.env.NATS_URL || 'nats://localhost:4222';
    this.nc = await connect({ servers: url });
  }

  async onModuleDestroy() {
    await this.nc?.drain();
  }

  async publish(subject: string, data: unknown) {
    if (!this.nc) throw new Error('NATS not connected');
    const payload = this.sc.encode(JSON.stringify(data));
    this.nc.publish(subject, payload);
  }
}

