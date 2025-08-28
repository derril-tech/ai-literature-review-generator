import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Export Integration Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /exports/review', () => {
    it('should create a DOCX export request', () => {
      return request(app.getHttpServer())
        .post('/exports/review')
        .send({
          projectId: 'test-project',
          type: 'docx'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accepted).toBe(true);
          expect(res.body.projectId).toBe('test-project');
          expect(res.body.type).toBe('docx');
        });
    });
  });

  describe('POST /exports/json', () => {
    it('should create a JSON export request', () => {
      return request(app.getHttpServer())
        .post('/exports/json')
        .send({
          projectId: 'test-project',
          type: 'json'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accepted).toBe(true);
          expect(res.body.projectId).toBe('test-project');
          expect(res.body.type).toBe('json');
        });
    });
  });

  describe('GET /exports', () => {
    it('should list exports for a project', () => {
      return request(app.getHttpServer())
        .get('/exports?projectId=test-project')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
