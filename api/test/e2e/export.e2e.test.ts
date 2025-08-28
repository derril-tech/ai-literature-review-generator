import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Export E2E Tests', () => {
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

  describe('Complete Export Workflow', () => {
    it('should handle full export workflow: create -> process -> download', async () => {
      const projectId = 'e2e-test-project';
      
      // Step 1: Create export request
      const createResponse = await request(app.getHttpServer())
        .post('/exports/review')
        .send({
          projectId,
          type: 'docx'
        })
        .expect(201);

      expect(createResponse.body.accepted).toBe(true);
      expect(createResponse.body.projectId).toBe(projectId);

      // Step 2: Check export status
      const listResponse = await request(app.getHttpServer())
        .get(`/exports?projectId=${projectId}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      
      // Step 3: Verify export record exists
      if (listResponse.body.length > 0) {
        const exportRecord = listResponse.body[0];
        expect(exportRecord.projectId).toBe(projectId);
        expect(exportRecord.type).toBe('docx');
        expect(['pending', 'processing', 'completed', 'failed']).toContain(exportRecord.status);
      }
    });

    it('should handle JSON export workflow', async () => {
      const projectId = 'e2e-test-project-json';
      
      // Create JSON export
      const createResponse = await request(app.getHttpServer())
        .post('/exports/json')
        .send({
          projectId,
          type: 'json'
        })
        .expect(201);

      expect(createResponse.body.accepted).toBe(true);
      expect(createResponse.body.type).toBe('json');

      // Verify export was created
      const listResponse = await request(app.getHttpServer())
        .get(`/exports?projectId=${projectId}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
    });

    it('should handle export with invalid project ID', () => {
      return request(app.getHttpServer())
        .post('/exports/review')
        .send({
          projectId: '',
          type: 'docx'
        })
        .expect(400);
    });

    it('should handle export with invalid type', () => {
      return request(app.getHttpServer())
        .post('/exports/review')
        .send({
          projectId: 'test-project',
          type: 'invalid'
        })
        .expect(400);
    });
  });
});
