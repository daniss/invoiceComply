# InvoiceComply - French e-Invoicing Compliance Platform

## PROJECT OVERVIEW
**Target**: French SMEs (5-50 employees) requiring e-invoicing compliance by September 2026
**Core Product**: SaaS platform converting PDF invoices to compliant Factur-X format
**Market Size**: 1.5M+ SMEs needing mandatory compliance solutions
**Revenue Model**: €29-149/month subscriptions + €199 setup fees

## CRITICAL COMPLIANCE REQUIREMENTS
- **Mandatory Date**: September 1, 2026 (large companies), September 2027 (SMEs)
- **Required Formats**: Factur-X, UBL, or CII structured formats
- **Transmission**: Must use certified platforms (PDP) like Chorus Pro
- **Validation**: All invoices must pass real-time compliance checks
- **Audit Trail**: Complete tracking required for tax authorities

## TECH STACK (DO NOT CHANGE)
```
Frontend: Next.js 14 + Tailwind CSS + Shadcn UI
Backend: Supabase (PostgreSQL + Auth + Storage)
PDF Processing: pdf-lib + custom Factur-X generator
Payments: Stripe (SEPA Direct Debit support)
Hosting: Vercel (EU data centers for GDPR)
APIs: Chorus Pro integration + Partner PDPs
Monitoring: Sentry + Google Analytics
```

## CORE MVP FEATURES (5 ESSENTIAL)
1. **PDF-to-Factur-X Converter**: Drag-drop upload with automatic field mapping
2. **PDP Gateway Integration**: Direct Chorus Pro transmission with status tracking
3. **Compliance Checker**: Real-time validation of mandatory fields
4. **Bulk Processing**: CSV import/export for accounting software compatibility
5. **Audit Dashboard**: Complete submission history and compliance reports

## PRICING TIERS
- **Starter**: €29/month (50 invoices)
- **Professional**: €79/month (500 invoices) - PRIMARY TARGET
- **Business**: €149/month (unlimited)
- **Setup Fee**: €199 for accounting integration

## DEVELOPMENT PRIORITIES
1. **French-First**: All UI text in French, French date formats, SIRET validation
2. **GDPR Compliance**: EU data hosting, privacy controls, consent management
3. **Chorus Pro Certification**: Official government platform integration
4. **Mobile Responsive**: Must work on tablets/phones for field workers
5. **Error Handling**: Detailed French error messages and retry logic

## DATABASE SCHEMA ESSENTIALS
```sql
-- Core tables needed
users (id, email, company_name, siret, subscription_tier)
invoices (id, user_id, original_pdf_url, facturx_xml, status, created_at)
transmissions (id, invoice_id, pdp_provider, transmission_id, status, response)
compliance_checks (id, invoice_id, field_validations, errors, passed)
audit_logs (id, user_id, action, details, timestamp)
```

## FRENCH BUSINESS CONTEXT
- **SIRET**: 14-digit business identifier (validate format)
- **VAT Numbers**: FR + 11 digits format
- **Legal Entity Types**: SARL, SAS, EURL, etc.
- **Accounting Periods**: Often calendar year, some fiscal year
- **Invoice Numbering**: Sequential, no gaps allowed by French law

## INTEGRATION PRIORITIES
1. **Chorus Pro API**: Government platform (highest priority)
2. **Sage Accounting**: Dominant SME accounting software
3. **Cegid/EBP**: Other major French accounting platforms
4. **Banking APIs**: For SEPA payment reconciliation

## COMPLIANCE VALIDATION RULES
- Invoice number must be sequential and unique
- Date format: DD/MM/YYYY (French standard)
- VAT rates: 20% standard, 10%/5.5%/2.1% reduced rates
- Mandatory fields: Supplier/buyer SIRET, amounts, VAT breakdown
- Payment terms: Legal maximum 60 days B2B, 30 days B2G

## SECURITY REQUIREMENTS
- **Data Encryption**: At rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: All user actions tracked
- **Backup**: Daily automated backups with 7-year retention
- **ISO 27001 Compliance**: Required for enterprise sales

## MARKETING INSIGHTS
- **Keywords**: "facture électronique", "Factur-X", "conformité 2026"
- **Competitors**: Limited SME-focused solutions (opportunity)
- **Channels**: LinkedIn, accounting firm partnerships, CCI chambers
- **Urgency**: Deadline-driven demand starting Q4 2025

## TESTING REQUIREMENTS
- **Sample Invoices**: Test with real French invoice formats
- **Chorus Pro Sandbox**: Use official test environment
- **Multi-browser**: Chrome, Firefox, Safari, Edge
- **Performance**: Handle 1000+ bulk uploads
- **Error Scenarios**: Network failures, invalid PDFs, API timeouts

## LAUNCH CHECKLIST
- [ ] French legal entity registration
- [ ] Chorus Pro certification obtained
- [ ] GDPR compliance audit passed
- [ ] Stripe SEPA payments configured
- [ ] EU data hosting verified
- [ ] French customer support prepared
- [ ] Accounting firm partnerships secured
- [ ] Demo environment with sample data

## CUSTOMER SUPPORT
- **Language**: French only for Phase 1
- **Hours**: Business hours (9-18h CET)
- **Channels**: Email, phone, in-app chat
- **Documentation**: French help center with video tutorials
- **Response Time**: <4h for paid customers

## GROWTH METRICS TO TRACK
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Churn rate by pricing tier
- Invoice processing volume
- Compliance success rate
- Customer support ticket volume
- Conversion funnel (trial → paid)

## REGULATORY MONITORING
- Watch for DGFiP (tax authority) updates
- Track Chorus Pro API changes
- Monitor new PDP certifications
- Follow European e-invoicing standards (EN 16931)
- Stay updated on VAT regulation changes

## RISKS & MITIGATION
- **Risk**: Chorus Pro API changes → Mitigation: Multiple PDP integrations
- **Risk**: Large competitors enter market → Mitigation: SME focus + speed
- **Risk**: Regulation delays → Mitigation: Expand to other EU countries
- **Risk**: Technical complexity → Mitigation: Simple UX + good support

Remember: This is a time-sensitive opportunity with guaranteed demand. Focus on simplicity, compliance, and French market needs. MVP launch target: 10-12 days.