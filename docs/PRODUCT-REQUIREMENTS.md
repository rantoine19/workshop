# Product Requirements Document

## Product Overview

- **Product Name**: HealthChat AI
- **Tagline**: "Chat with your health data. Understand it. Act on it."
- **Type**: Web application
- **Category**: Healthcare/Wellness (B2B SaaS via employer wellness platform)

## Vision & Problem Statement

Most patients don't understand lab results or medical terminology, forget what to ask during doctor visits, and feel intimidated by healthcare systems. They can't act on their medical data, so they live with the issue. This leads to poor health literacy, missed diagnoses or follow-ups, and increased healthcare costs.

Existing AI chatbots attempting to solve this are often not HIPAA-compliant, creating privacy risks and eroding user trust.

HealthChat AI bridges the gap between medical data and patient understanding by turning complex reports into actionable conversations — explained at a 5th grade reading level so anyone can understand and act on their health data.

## Target Audience

- **Primary**: Adult individuals with recent lab results and screenings or chronic diseases trying to be healthier
- **User Description**: An adult individual with recent lab results or screenings who wants to understand their health data in plain language and know what to ask their doctor
- **Key Pain Point**: Not understanding what their lab results mean, not knowing what questions to ask their doctor, and not being able to act upon their medical data — so they live with the issue
- **Secondary Users**: Chronic condition patients (diabetes, hypertension) managing ongoing health

### Current Solutions

A mix of cobbled-together workarounds — Googling medical terms, using non-HIPAA-compliant AI tools, or simply not understanding their results and living with the confusion until their next doctor visit.

## Features

### MVP (Must Have)

1. **Medical Report Upload & Parsing**
   - PDF and image ingestion
   - OCR and structured data extraction
   - Detect biomarkers, abnormal ranges, and trends

2. **Conversational AI Interface**
   - Natural language chat
   - Context-aware responses about uploaded health data
   - Memory of uploaded reports within session

3. **Health Simplification Engine**
   - Converts clinical language to 5th grade reading level
   - Explains: what it means, why it matters, what to do next

4. **Doctor Question Generator** (Core Differentiator)
   - Auto-generates clarifying questions
   - Follow-up recommendations
   - Risk-based prompts
   - Example outputs: "What is causing my elevated LDL?", "Should I consider medication or lifestyle changes first?"

5. **Risk Flagging System**
   - Green / Yellow / Red indicators
   - Based on lab ranges, user profile, and trends over time

6. **HIPAA-Compliant Privacy & Security Layer**
   - HIPAA-compliant storage
   - Encryption (in transit + at rest)
   - Role-based access control
   - Audit logs
   - BAA agreements

### Out of Scope (v1)

- Voice-to-text journaling
- Chat-based storytelling / JobSeek-style journaling
- Multi-modal image uploads beyond lab reports (e.g., prescriptions)
- Mobile-native app (v1 is web only)

### Core Value Proposition

Take complex medical data and explain it in plain language that anyone can understand and act on — turning confusion into confidence before a doctor visit.

## Success Metrics

- **Primary Metrics**: Daily/Monthly Active Users, User Retention Rate, Task Completion Rate
- **3-Month Targets**:
  - 500 Monthly Active Users
  - 60% 30-day retention
  - 75% of users generate doctor questions after uploading a report
  - 75% of users read their health summaries

## Competitive Analysis

### Competitors

| Competitor | What They Do | HIPAA? | Differentiator |
|---|---|---|---|
| **Hathr AI** | Translates lab results into plain English for patient-doctor review | Yes | Purpose-built for lab interpretation |
| **Patiently AI** | Simplifies medical notes/results and generates doctor visit prep questions | UK medical device (US HIPAA unclear) | Doctor visit prep + regulatory credibility |
| **RosettaMD** | Translates clinical documents into plain, compassionate English | Not stated | Deterministic (no hallucinations) — 550K+ medical concepts |

**Notable mention**: ChatGPT Health (OpenAI) — lets users link patient portals and ask about lab results, but explicitly states HIPAA does not apply to their consumer product.

### Differentiator

HealthChat AI is the only HIPAA-compliant AI health chatbot embedded in an employer wellness platform that combines medical report parsing, 5th-grade-level health simplification, doctor visit prep questions, and risk flagging — all in one integrated experience. Unlike competitors, it's designed for the employer wellness channel, not just individual consumers.

## Constraints & Requirements

- **Timeline**: ASAP (1-2 weeks)
- **Constraints**: Time — need to launch quickly
- **Technical Requirements**: Must meet HIPAA compliance (BAA agreements, encrypted storage, audit logs, role-based access control)
