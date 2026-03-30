# Technical Architecture

## Overview

HealthChat AI is a HIPAA-compliant AI health chatbot built as a Next.js full-stack application deployed on Render. Users upload medical reports (PDFs/images), and the system uses Anthropic Claude's multimodal capabilities to parse, interpret, and explain health data in plain language at a 5th grade reading level. The architecture prioritizes simplicity (single deployable unit) to meet the 1-2 week launch timeline.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Testing**: Vitest + React Testing Library

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes (Route Handlers)
- **Language**: TypeScript
- **AI SDK**: Anthropic SDK (`@anthropic-ai/sdk`)
- **Testing**: Vitest

### Database
- **Primary**: Supabase (PostgreSQL)
  - Row-level security (RLS) for multi-tenant data isolation
  - Supports ephemeral PR databases via branching
  - HIPAA BAA available on Pro/Enterprise plans

### File Storage
- **Provider**: Supabase Storage
  - S3-backed, encryption at rest
  - Signed URLs for secure file access
  - Bucket policies for access control

### Authentication
- **Provider**: Supabase Auth
  - Email/password authentication
  - OAuth providers (Google, etc.)
  - JWT-based sessions
  - Integrates with RLS policies

### AI/ML
- **LLM**: Anthropic Claude (claude-sonnet-4-20250514 for chat, claude-sonnet-4-20250514 for vision/document parsing)
  - HIPAA BAA available
  - Multimodal: handles PDF/image parsing AND conversational AI
  - No separate OCR service needed — Claude Vision reads documents directly

### Infrastructure
- **Hosting**: Render (Web Service)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking via self-receiver pattern)
- **DNS/CDN**: Render-managed

## System Design

### Component Diagram

```
+--------------------------------------------------+
|                    Client (Browser)                |
|  +----------------------------------------------+ |
|  |           Next.js App (React 19)             | |
|  |                                              | |
|  |  +----------+  +-----------+  +----------+  | |
|  |  | Upload   |  | Chat      |  | Dashboard|  | |
|  |  | Panel    |  | Interface |  | & Risk   |  | |
|  |  +----------+  +-----------+  +----------+  | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
                        |
                        | HTTPS
                        v
+--------------------------------------------------+
|              Next.js API Routes (Render)          |
|                                                  |
|  +-------------+  +-------------+  +-----------+ |
|  | /api/upload  |  | /api/chat   |  | /api/     | |
|  | (file store) |  | (AI chat)   |  | reports   | |
|  +-------------+  +-------------+  +-----------+ |
|  +-------------+  +-------------+  +-----------+ |
|  | /api/parse   |  | /api/doctor |  | /api/     | |
|  | (doc parse)  |  | -questions  |  | risk-flag | |
|  +-------------+  +-------------+  +-----------+ |
+--------------------------------------------------+
         |                |                |
         v                v                v
+----------------+  +-----------+  +----------------+
| Supabase       |  | Anthropic |  | Supabase       |
| Storage        |  | Claude    |  | PostgreSQL     |
| (encrypted     |  | API       |  | (RLS-enabled)  |
|  file store)   |  |           |  |                |
+----------------+  +-----------+  +----------------+
```

### Data Flow

1. **Upload Flow**:
   - User uploads PDF/image via browser
   - File sent to `/api/upload` -> stored in Supabase Storage (encrypted)
   - `/api/parse` sends file to Claude Vision for extraction
   - Parsed data (biomarkers, values, ranges) stored in Supabase DB
   - Risk flags (G/Y/R) calculated and stored

2. **Chat Flow**:
   - User sends message via chat interface
   - `/api/chat` loads user's parsed report data as context
   - Message + context sent to Claude API
   - Claude responds with plain-language explanation (5th grade level)
   - Chat history stored in Supabase DB

3. **Doctor Question Flow**:
   - Triggered after report parsing or on user request
   - `/api/doctor-questions` sends parsed data to Claude with specialized prompt
   - Claude generates personalized questions
   - Questions stored and displayed to user

### API Design

All APIs use Next.js Route Handlers (REST pattern):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/*` | Various | Supabase Auth callbacks |
| `/api/upload` | POST | Upload medical report (PDF/image) |
| `/api/parse` | POST | Parse uploaded document via Claude Vision |
| `/api/chat` | POST | Send chat message, get AI response |
| `/api/reports` | GET | List user's parsed reports |
| `/api/reports/[id]` | GET | Get specific report with parsed data |
| `/api/doctor-questions` | POST | Generate doctor visit questions |
| `/api/risk-flags` | GET | Get risk indicators for a report |
| `/api/health` | GET | Health check endpoint |
| `/api/error-events` | POST | Sentry self-receiver |

## Data Models

### Core Entities

```
User (Supabase Auth)
├── id: uuid (PK)
├── email: string
├── created_at: timestamp
└── updated_at: timestamp

Profile
├── id: uuid (PK, FK -> User)
├── display_name: string
├── date_of_birth: date (encrypted)
├── gender: string
└── updated_at: timestamp

Report
├── id: uuid (PK)
├── user_id: uuid (FK -> User)
├── file_path: string (Supabase Storage ref)
├── file_type: enum (pdf, image)
├── original_filename: string
├── status: enum (uploaded, parsing, parsed, error)
├── created_at: timestamp
└── updated_at: timestamp

ParsedResult
├── id: uuid (PK)
├── report_id: uuid (FK -> Report)
├── raw_extraction: jsonb (full Claude response)
├── biomarkers: jsonb (structured: name, value, unit, range, flag)
├── summary_plain: text (5th grade level summary)
├── created_at: timestamp
└── updated_at: timestamp

RiskFlag
├── id: uuid (PK)
├── parsed_result_id: uuid (FK -> ParsedResult)
├── biomarker_name: string
├── value: numeric
├── reference_low: numeric
├── reference_high: numeric
├── flag: enum (green, yellow, red)
├── trend: enum (improving, stable, worsening, unknown)
└── created_at: timestamp

ChatSession
├── id: uuid (PK)
├── user_id: uuid (FK -> User)
├── report_id: uuid (FK -> Report, nullable)
├── created_at: timestamp
└── updated_at: timestamp

ChatMessage
├── id: uuid (PK)
├── session_id: uuid (FK -> ChatSession)
├── role: enum (user, assistant)
├── content: text
├── created_at: timestamp
└── updated_at: timestamp

DoctorQuestion
├── id: uuid (PK)
├── parsed_result_id: uuid (FK -> ParsedResult)
├── question: text
├── category: enum (clarifying, follow_up, lifestyle, medication)
├── priority: enum (high, medium, low)
├── created_at: timestamp
└── updated_at: timestamp
```

### Database Schema Notes

- All tables have RLS policies scoped to `auth.uid()`
- PHI fields use Supabase Vault for column-level encryption where needed
- `biomarkers` JSONB field allows flexible storage across different lab report formats
- Indexes on `user_id` and `report_id` for query performance

## Development Standards

### Code Style
- **Linting**: ESLint with `eslint-config-next`
- **Formatting**: Prettier (default config)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Imports**: Absolute imports via `@/` path alias

### Testing Requirements
- **Unit tests**: All API route handlers, utility functions
- **Integration tests**: Upload -> parse -> chat flow
- **Component tests**: Key UI components (chat interface, upload panel, risk display)
- **Coverage target**: 80% for API routes, 70% overall
- **Testing tools**: Vitest + React Testing Library + jsdom

### Documentation
- API endpoints documented with TypeScript types
- Complex business logic commented inline
- Architecture decisions recorded as ADRs in this document

### Code Review Checklist
- [ ] No hardcoded URLs (use `window.location.origin` or request headers)
- [ ] PHI data properly encrypted/protected
- [ ] RLS policies in place for new tables
- [ ] API routes validate input and handle errors
- [ ] No PHI logged to console or error tracking
- [ ] Tests pass (`npm test`)
- [ ] Lint clean (`npm run lint`)
- [ ] Types check (`npm run typecheck`)

## Security

### Authentication
- Supabase Auth with JWT tokens
- Session management via Supabase client library
- Protected API routes verify JWT on every request

### Authorization
- Row-Level Security (RLS) on all Supabase tables
- Users can only access their own data
- No admin role in v1 (out of scope)

### Data Protection (HIPAA)
- **Encryption in transit**: TLS 1.2+ (Render enforces HTTPS)
- **Encryption at rest**: Supabase Storage (S3 AES-256), Supabase DB (encrypted volumes)
- **PHI handling**: Sensitive fields use Supabase Vault, no PHI in logs
- **Audit logs**: Supabase provides database-level audit logging
- **BAA**: Required from Supabase (Pro plan) and Anthropic
- **Data retention**: User can delete their data; reports purged after configurable period
- **Access control**: RLS ensures tenant isolation

### AI Safety
- Claude responses include disclaimer: "This is not medical advice"
- No diagnosis or treatment recommendations — only explanations and questions
- Prompt engineering enforces 5th grade reading level and non-diagnostic tone

## Scalability

### Current Targets (MVP)
- 500 MAU
- ~50 concurrent users
- ~1,000 report uploads/month
- ~5,000 chat messages/month

### Scaling Strategy
- **Render**: Scale web service horizontally (add instances)
- **Supabase**: Connection pooling via Supavisor, upgrade plan as needed
- **Claude API**: Rate limits managed via queue (if needed post-MVP)
- **Storage**: Supabase Storage scales automatically (S3-backed)

## Architecture Decision Records

### ADR-001: Next.js Full-Stack Monolith
- **Status**: Accepted
- **Context**: 1-2 week timeline requires minimal infrastructure complexity. Team needs to ship fast.
- **Decision**: Use Next.js as a full-stack framework (API routes + React frontend) instead of separate FastAPI backend + React frontend.
- **Consequences**: Single deployment unit on Render. Simpler CI/CD. Limits future Python-specific ML pipelines, but Claude API is accessible from TypeScript.

### ADR-002: Claude Vision for Document Parsing
- **Status**: Accepted
- **Context**: Need OCR + medical data extraction from PDFs/images. AWS Textract + Comprehend Medical would add complexity and AWS dependency.
- **Decision**: Use Claude's multimodal (vision) capabilities to directly read and interpret lab report documents.
- **Consequences**: Single AI provider for all features. Simpler architecture. May be less accurate than purpose-built medical OCR for edge cases — monitor and reassess post-MVP.

### ADR-003: Supabase as Unified Backend
- **Status**: Accepted
- **Context**: Need database, file storage, and auth — all HIPAA-compliant. Tight timeline favors integrated solutions.
- **Decision**: Use Supabase for PostgreSQL, Storage, and Auth.
- **Consequences**: Single vendor for data layer. RLS provides strong tenant isolation. HIPAA BAA available on Pro plan. Ephemeral PR databases supported via branching.

### ADR-004: No Separate OCR Service
- **Status**: Accepted
- **Context**: Original PRD specified AWS Textract. Claude Vision can handle PDF/image interpretation directly.
- **Decision**: Skip dedicated OCR service; rely on Claude Vision for document parsing.
- **Consequences**: Fewer services to manage. Potential quality trade-off for heavily formatted or handwritten documents. Can add Textract later if needed.
