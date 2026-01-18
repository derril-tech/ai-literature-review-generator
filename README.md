# AI Literature Review Generator

> **Transform your research workflow with AI-powered literature review automation**

[![CI/CD](https://github.com/your-org/ai-literature-review-generator/workflows/CI/badge.svg)](https://github.com/your-org/ai-literature-review-generator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green.svg)](https://www.python.org/)

## 🎯 What is AI Literature Review Generator?

The **AI Literature Review Generator** is a comprehensive, production-ready platform that automates the entire literature review process using advanced AI and machine learning techniques. It transforms how researchers, academics, and organizations conduct systematic literature reviews by providing intelligent document processing, automated theme discovery, and structured synthesis.

## 🚀 What does it do?

### Core Capabilities

1. **Intelligent Document Processing**
   - PDF parsing with OCR fallback for scanned documents
   - Automatic sectionization using IMRAD structure (Introduction, Methods, Results, Discussion)
   - Metadata enrichment via Crossref and OpenAlex APIs
   - Duplicate detection using DOI, MD5 hash, and fuzzy matching

2. **AI-Powered Analysis**
   - Semantic embeddings using SentenceTransformers
   - K-means clustering with silhouette analysis for optimal theme discovery
   - N-gram based theme labeling with provenance tracking
   - Structured summaries with confidence scoring

3. **Advanced Literature Synthesis**
   - Automated theme identification and hierarchy building
   - Citation bundle generation with representative paper selection
   - Quote extraction with source attribution
   - BibTeX and CSL JSON export formats

4. **Interactive Q&A System**
   - Hybrid retrieval (BM25 + dense embeddings)
   - Context-aware answer generation with citations
   - Confidence scoring and source transparency

5. **Comprehensive Export System**
   - DOCX narrative reviews with structured formatting
   - JSON bundles for programmatic access
   - CSV/XLSX matrices for methods, metrics, and datasets
   - Shareable read-only links

## 💡 Benefits of the Product

### For Researchers
- **Time Savings**: Reduce literature review time from weeks to days
- **Comprehensive Coverage**: Never miss relevant papers with intelligent deduplication
- **Quality Assurance**: Structured summaries with confidence scoring and provenance
- **Collaboration**: Multi-user support with role-based access control

### For Academic Institutions
- **Scalability**: Handle large-scale systematic reviews efficiently
- **Reproducibility**: Transparent methodology with full audit trails
- **Integration**: RESTful API for integration with existing research workflows
- **Compliance**: Built-in audit logging and data retention policies

### For Organizations
- **Cost Reduction**: Automate expensive manual review processes
- **Risk Mitigation**: Systematic approach reduces bias and improves coverage
- **Knowledge Management**: Centralized repository with advanced search capabilities
- **Competitive Intelligence**: Rapid synthesis of emerging research trends

### For Research Teams
- **Collaborative Workflows**: Real-time collaboration with version control
- **Standardization**: Consistent methodology across team members
- **Transparency**: Full traceability from source documents to final synthesis
- **Flexibility**: Customizable inclusion/exclusion criteria and filters

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Workers       │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis         │    │   NATS          │
│   + pgvector    │    │   (Cache/Queue) │    │   (Event Bus)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** with SSR/ISR and Server Actions
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **D3.js** for data visualizations
- **React** for component architecture

### Backend
- **NestJS** with TypeScript
- **TypeORM** for database operations
- **JWT** authentication with bcrypt
- **RBAC** with Casbin
- **OpenAPI 3.1** specification

### Workers (Python)
- **FastAPI** for health checks
- **SentenceTransformers** for embeddings
- **scikit-learn** for clustering
- **PyMuPDF** for PDF processing
- **pytesseract** for OCR

### Infrastructure
- **PostgreSQL 16** with pgvector extension
- **Redis** for caching and sessions
- **NATS** for event-driven architecture
- **Prometheus/Grafana** for monitoring
- **Docker** for containerization

## 📦 Installation

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 16+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ai-literature-review-generator.git
   cd ai-literature-review-generator
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose -f infra/docker-compose.dev.yml up -d
   ```

4. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # API
   cd ../api && npm install
   
   # Workers
   cd ../workers && pip install -e .
   ```

5. **Run database migrations**
   ```bash
   cd api && npm run migration:run
   ```

6. **Start the application**
   ```bash
   # Terminal 1: Frontend
   cd frontend && npm run dev
   
   # Terminal 2: API
   cd api && npm run start:dev
   
   # Terminal 3: Workers
   cd workers && python -m pdf_worker.run
   cd workers && python -m meta_worker.run
   cd workers && python -m embed_worker.run
   cd workers && python -m cluster_worker.run
   cd workers && python -m label_worker.run
   cd workers && python -m summary_worker.run
   cd workers && python -m bundle_worker.run
   cd workers && python -m export_worker.run
   ```

7. **Access the application**
   - Frontend: http://localhost:3001
   - API: http://localhost:3000
   - Grafana: http://localhost:3000 (admin/admin)

## 🔧 Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=airg

# JWT
JWT_SECRET=your-secret-key

# NATS
NATS_URL=nats://localhost:4222

# Redis
REDIS_URL=redis://localhost:6379

# S3/R2 (optional)
S3_BUCKET=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

### API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /uploads` - Document upload
- `GET /documents` - List documents
- `POST /themes/rebuild` - Rebuild themes
- `GET /themes` - List themes
- `POST /exports/review` - Generate DOCX review
- `POST /exports/json` - Generate JSON bundle

## 📊 Monitoring

The application includes comprehensive monitoring:

- **Prometheus** metrics collection
- **Grafana** dashboards for visualization
- **Health checks** for all services
- **Audit logging** for compliance
- **Error tracking** with Sentry integration

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/ai-literature-review-generator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ai-literature-review-generator/discussions)

## 🙏 Acknowledgments

- [SentenceTransformers](https://www.sbert.net/) for semantic embeddings
- [PyMuPDF](https://pymupdf.readthedocs.io/) for PDF processing
- [scikit-learn](https://scikit-learn.org/) for machine learning algorithms
- [NestJS](https://nestjs.com/) for the backend framework
- [Next.js](https://nextjs.org/) for the frontend framework

---

**Made with ❤️ by Derril Filemon for the research community**
