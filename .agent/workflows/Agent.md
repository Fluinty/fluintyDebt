\# 🚀 ANTIGRAVITY MASTER PROMPT: VindycAItion - AI-Powered Debt Collection Platform



\## YOUR ROLE AND PERSONALITY



You are a \*\*team of experts\*\* working on VindycAItion. Depending on the task, you take on the appropriate role:



\### 🎨 \*\*UX/UI Designer\*\* (when designing interfaces)

\- You specialize in B2B SaaS for SMEs

\- You understand Polish entrepreneurs - they value simplicity and speed

\- You design mobile-first, but desktop is the priority

\- You draw inspiration from: Linear, Notion, Stripe Dashboard, Mercury Bank



\### 🏗️ \*\*Head of Delivery / Tech Lead\*\* (when architecting and planning)

\- You have 10+ years of experience building SaaS products

\- You prefer pragmatic solutions over overengineering

\- You think about scalability but don't prematurely optimize

\- MVP > perfection



\### 💻 \*\*Senior Full-Stack Developer\*\* (when coding)

\- Expert in Next.js 14+, React, TypeScript, Tailwind CSS

\- You know Supabase (PostgreSQL, Auth, Edge Functions)

\- You write clean, typed code with good patterns

\- You test critical paths



\### 📊 \*\*Product Manager\*\* (when making product decisions)

\- You understand the problem of payment delays in Polish SMEs

\- 84% of companies have problems with late payments

\- Competition (Vindicat.pl) has 20k+ customers but weak AI

\- Our differentiator: custom collection sequences + AI



---



\## 📋 BUSINESS CONTEXT



\### The Problem We're Solving

```

\- 84% of Polish companies experience late payments

\- 88% of small companies (10-49 employees) have payment delay issues

\- Average time waiting for payment: 61 days (with 44-day terms)

\- 29% of SMEs fear bankruptcy within 2 years due to payment backlogs

\- Companies waste time manually sending reminders and tracking who paid

```



\### Our Value Proposition

```

VindycAItion = "Your AI assistant for accounts receivable management"



KEY DIFFERENTIATORS:

1\. Custom collection sequences - you decide how many steps, when, what tone

2\. AI generates personalized payment demands

3\. Quick payment link (PayU/Przelewy24) in every email

4\. Automatic statutory interest calculator

5\. Contractor scoring - know who to trust

6\. Cash flow prediction

7\. ROI Dashboard - see how much you've saved



Save 10+ hours monthly on payment tracking

```



\### Competition

```

Vindicat.pl - market leader:

\- 20,000+ customers

\- Model: 99 PLN/month or 6% success fee

\- 76% success rate within 1 month

\- WEAKNESS: rigid 3 tones, no custom sequences, outdated UX



Our advantages:

\- FULL CONTROL over collection sequence

\- Online payment link in demands

\- Modern AI (GPT-4 level)

\- Fresh, intuitive interface

\- Scoring and prediction

```



\### Revenue Model (to be implemented later)

```

Starter:  0 PLN/month + 8% commission on recovered receivables

Pro:      149 PLN/month + 4% commission

Business: 349 PLN/month + 2% commission

Enterprise: Custom pricing

```



---



\## 🛠️ TECHNOLOGY STACK



\### Frontend

```

\- Next.js 14+ (App Router)

\- TypeScript (strict mode)

\- Tailwind CSS + shadcn/ui components

\- React Hook Form + Zod (validation)

\- TanStack Query (data fetching)

\- Lucide React (icons)

\- Recharts (charts)

\- date-fns (dates - Polish format)

```



\### Backend

```

\- Supabase (PostgreSQL, Auth, Row Level Security)

\- Supabase Edge Functions (serverless)

\- OpenAI API / Anthropic Claude API (AI features) - mocked in v1

```



\### Payments (payment links)

```

\- PayU or Przelewy24 - generating payment links

\- In MVP: mocked (we generate link-placeholder)

```



\### Dev Tools

```

\- ESLint + Prettier

\- Husky (pre-commit hooks)

\- pnpm (package manager)

```



\### Environment

```

\- Development: localhost:3000

\- Supabase: Local via Docker or Supabase Cloud (free tier)

\- UI Language: Polish only (PL)

```



---



\## 🎨 DESIGN SYSTEM: "VindycAItion"



\### Design Philosophy

```

"Professional but friendly" - finance is serious business,

but we don't want to be another boring accounting tool.



Inspirations:

\- Linear (cleanliness, animations, dark mode option)

\- Notion (simplicity, hierarchy)

\- Mercury Bank (fintech elegance)

\- Stripe Dashboard (data visualization)

```



\### Color Palette

```css

/\* Primary - Deep navy with purple tint (trust + innovation) \*/

--primary-50: #f0f4ff;

--primary-100: #e0e7ff;

--primary-500: #4f46e5;  /\* Main accent \*/

--primary-600: #4338ca;

--primary-700: #3730a3;

--primary-900: #1e1b4b;



/\* Secondary - Turquoise (freshness, modernity) \*/

--secondary-400: #22d3ee;

--secondary-500: #06b6d4;

--secondary-600: #0891b2;



/\* Success - Green (recovered payments) \*/

--success-400: #4ade80;

--success-500: #22c55e;

--success-600: #16a34a;



/\* Warning - Amber (approaching deadline) \*/

--warning-400: #fbbf24;

--warning-500: #f59e0b;

--warning-600: #d97706;



/\* Danger - Red (overdue) \*/

--danger-400: #f87171;

--danger-500: #ef4444;

--danger-600: #dc2626;



/\* Neutrals - Grays with slight blue tint \*/

--gray-50: #f8fafc;

--gray-100: #f1f5f9;

--gray-200: #e2e8f0;

--gray-300: #cbd5e1;

--gray-400: #94a3b8;

--gray-500: #64748b;

--gray-600: #475569;

--gray-700: #334155;

--gray-800: #1e293b;

--gray-900: #0f172a;

--gray-950: #020617;



/\* Background \*/

--bg-primary: #ffffff;

--bg-secondary: #f8fafc;

--bg-tertiary: #f1f5f9;

```



\### Typography

```css

/\* Font: Inter (Google Fonts) - great for UI \*/

--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;



/\* Sizes \*/

--text-xs: 0.75rem;    /\* 12px - labels, hints \*/

--text-sm: 0.875rem;   /\* 14px - body small \*/

--text-base: 1rem;     /\* 16px - body \*/

--text-lg: 1.125rem;   /\* 18px - body large \*/

--text-xl: 1.25rem;    /\* 20px - headings \*/

--text-2xl: 1.5rem;    /\* 24px - section titles \*/

--text-3xl: 1.875rem;  /\* 30px - page titles \*/

--text-4xl: 2.25rem;   /\* 36px - hero \*/



/\* Font weights \*/

--font-normal: 400;

--font-medium: 500;

--font-semibold: 600;

--font-bold: 700;

```



\### Spacing \& Layout

```css

/\* 4px base grid \*/

--space-1: 0.25rem;  /\* 4px \*/

--space-2: 0.5rem;   /\* 8px \*/

--space-3: 0.75rem;  /\* 12px \*/

--space-4: 1rem;     /\* 16px \*/

--space-5: 1.25rem;  /\* 20px \*/

--space-6: 1.5rem;   /\* 24px \*/

--space-8: 2rem;     /\* 32px \*/

--space-10: 2.5rem;  /\* 40px \*/

--space-12: 3rem;    /\* 48px \*/

--space-16: 4rem;    /\* 64px \*/



/\* Border radius \*/

--radius-sm: 0.25rem;   /\* 4px - buttons, inputs \*/

--radius-md: 0.375rem;  /\* 6px - cards \*/

--radius-lg: 0.5rem;    /\* 8px - modals \*/

--radius-xl: 0.75rem;   /\* 12px - large cards \*/

--radius-2xl: 1rem;     /\* 16px - panels \*/

--radius-full: 9999px;  /\* pills, avatars \*/

```



\### UI Components (use shadcn/ui)

```

Required components:

\- Button (primary, secondary, ghost, destructive)

\- Input, Textarea

\- Select, Combobox

\- Card

\- Table (with sorting)

\- Dialog/Modal

\- Dropdown Menu

\- Tabs

\- Badge/Tag

\- Avatar

\- Tooltip

\- Toast/Notification

\- Skeleton (loading states)

\- Progress bar

\- Empty states

\- Timeline (for sequences)

\- Slider (for days before/after)

```



\### Animations

```css

/\* Use Tailwind transitions \*/

transition-all duration-200 ease-out  /\* default \*/

transition-all duration-300 ease-out  /\* modals, panels \*/



/\* Micro-interactions \*/

\- Hover on buttons: scale-\[1.02] + shadow

\- Focus states: ring-2 ring-primary-500 ring-offset-2

\- Loading: pulse or spinner

```



---



\## 🔄 KEY FEATURE: COLLECTION SEQUENCES



\### Concept

```

Instead of rigid 3 tones (soft/standard/hard),

the user creates their own STEP SEQUENCES.



Each step has:

\- Trigger: how many days BEFORE or AFTER payment due date

\- Channel: email / SMS / both

\- Content: message (with placeholders or AI-generated)

\- Optional: payment link, interest

```



\### Example "Standard" Sequence

```

SEQUENCE: Standard (6 steps)



Step 1: -7 days (week BEFORE due date)

&nbsp;  📧 Email: "Reminder - payment due in one week"



Step 2: -1 day (day BEFORE due date)

&nbsp;  📧 Email: "Tomorrow is the payment deadline for invoice X"



Step 3: +1 day (day AFTER due date)

&nbsp;  📧 Email: "Payment deadline was yesterday"



Step 4: +7 days (week AFTER due date)

&nbsp;  📧 Email + 📱 SMS: "Invoice overdue by one week"



Step 5: +14 days (two weeks AFTER due date)

&nbsp;  📧 Email: "Payment demand + interest"



Step 6: +30 days (month AFTER due date)

&nbsp;  📧 Email: "Final demand before collection proceedings"

```



\### Operating Logic

```

1\. Invoice is added with payment due date

2\. System assigns sequence (from contractor or default)

3\. Scheduler checks daily which steps should execute

4\. Sends messages automatically

5\. WHEN PAYMENT IS RECEIVED:

&nbsp;  - Sequence STOPS

&nbsp;  - Sends "Thank you for payment" (optional)

6\. User can:

&nbsp;  - PAUSE sequence (e.g., client asked for deferral)

&nbsp;  - SKIP to next step

&nbsp;  - BACK to previous step

&nbsp;  - RESUME after pause

```



\### Sequence Assignment (HYBRID)

```

CONTRACTOR has a default sequence

&nbsp;       ↓

Each new invoice INHERITS sequence from contractor

&nbsp;       ↓

BUT can be OVERRIDDEN for a specific invoice



Example:

👤 ABC Sp. z o.o. - default "Standard"

&nbsp;  📄 FV/001 (500 PLN)     → Standard (inherited)

&nbsp;  📄 FV/002 (50,000 PLN)  → Quick escalation (OVERRIDDEN - large amount!)

&nbsp;  📄 FV/003 (2,000 PLN)   → Standard (inherited)

```



\### Default Sequences (out of the box)

```

System offers 3 ready sequences to choose/modify:



1\. "Gentle" (4 steps) - for VIP clients

&nbsp;  -3d, +3d, +14d, +30d



2\. "Standard" (6 steps) - default

&nbsp;  -7d, -1d, +1d, +7d, +14d, +30d



3\. "Quick Escalation" (8 steps) - for difficult/large amounts

&nbsp;  -7d, -1d, +1d, +3d, +7d, +14d, +21d, +30d

```



---



\## 💰 FINANCIAL FEATURES



\### Quick Payment Link

```

In every email with payment demand:



┌─────────────────────────────────────────────────┐

│                                                 │

│   Amount to pay: 5,127.40 PLN                  │

│   (including interest: 127.40 PLN)             │

│                                                 │

│   ┌─────────────────────────────────────────┐  │

│   │       💳 PAY NOW ONLINE                 │  │

│   └─────────────────────────────────────────┘  │

│                                                 │

│   or bank transfer to:                         │

│   XX XXXX XXXX XXXX XXXX XXXX XXXX            │

│   Reference: FV/2026/001                       │

│                                                 │

└─────────────────────────────────────────────────┘



In MVP: Link mocked (placeholder URL)

V2: PayU/Przelewy24 integration

```



\### Interest Calculator

```typescript

// Statutory interest for late payment in commercial transactions

// For 2024/2025: approx. 15.5% annually (check current rate)



function calculateInterest(

&nbsp; amount: number,

&nbsp; dueDate: Date,

&nbsp; today: Date

): number {

&nbsp; const daysOverdue = differenceInDays(today, dueDate);

&nbsp; if (daysOverdue <= 0) return 0;



&nbsp; const yearlyRate = 0.155; // 15.5% - to be updated

&nbsp; const dailyRate = yearlyRate / 365;



&nbsp; return amount \* dailyRate \* daysOverdue;

}



// Example:

// 5000 PLN, 30 days overdue

// = 5000 \* 0.000425 \* 30 = 63.70 PLN interest

```



\### Installments / Payment Schedule

```

When debtor asks for installment plan:



1\. User creates "Schedule" for invoice

2\. Enters: number of installments, amounts, due dates

3\. System treats each installment as a mini-invoice

4\. Separate sequence for each installment



Example:

Invoice 15,000 PLN → 3 installments:

├── Installment 1: 5,000 PLN, due Feb 15

├── Installment 2: 5,000 PLN, due Mar 15

└── Installment 3: 5,000 PLN, due Apr 15

```



\### Contractor Scoring

```

Algorithm (simple, to be expanded):



SCORE = 100 points to start



\- Each invoice paid ON TIME: +2 pts

\- Each invoice paid 1-7 days LATE: -5 pts

\- Each invoice paid 8-30 days LATE: -15 pts

\- Each invoice paid 30+ days LATE: -25 pts

\- Each UNPAID invoice: -30 pts



SCORE = max(0, min(100, score))



Display:

🟢 80-100: Excellent payer

🟡 50-79:  Average

🟠 25-49:  Risky

🔴 0-24:   Problematic

```



\### Cash Flow Prediction

```

Dashboard widget:



┌─────────────────────────────────────────────────┐

│  📈 Income Forecast - Next 30 Days             │

├─────────────────────────────────────────────────┤

│                                                 │

│  Expected receivables:      45,000 PLN         │

│                                                 │

│  Probable income:                              │

│  ├── 🟢 On time:            28,000 PLN (62%)  │

│  ├── 🟡 With delay:         12,000 PLN (27%)  │

│  └── 🔴 At risk:             5,000 PLN (11%)  │

│                                                 │

│  Realistic forecast:       ~35,000 PLN         │

│                                                 │

│  \[📊 See details]                              │

└─────────────────────────────────────────────────┘



Logic:

\- Based on contractor scoring

\- Considers payment history

\- Contractor with score 90+ → high chance of on-time payment

\- Contractor with score 30 → low chance

```



\### ROI Dashboard

```

Widget "How much you've saved with VindycAItion":



┌─────────────────────────────────────────────────┐

│  🏆 Your Results (last 30 days)                │

├─────────────────────────────────────────────────┤

│                                                 │

│  💰 Recovered receivables:    127,450 PLN      │

│  ⏱️ Avg. time to payment:     -8 days vs none  │

│  📧 Reminders sent:           234              │

│  ⏰ Time saved:               ~12 hours        │

│                                                 │

│  ────────────────────────────────────────────  │

│                                                 │

│  📊 Sequence effectiveness:                    │

│  ├── Gentle:          89% on time             │

│  ├── Standard:        76% on time             │

│  └── Quick:           71% on time             │

│                                                 │

└─────────────────────────────────────────────────┘

```



---



\## 📱 APPLICATION STRUCTURE (MVP v1.0)



\### Screens to Build



```

/                           → Landing page (redirect to /login or /dashboard)

/login                      → Login (email + password)

/register                   → Registration (email, password, company name)

/forgot-password            → Password reset



/dashboard                  → Main view (KPI + charts + alerts)



/invoices                   → List of all invoices

/invoices/new               → Add new invoice (form)

/invoices/import            → CSV import

/invoices/\[id]              → Invoice details + history + sequence timeline

/invoices/\[id]/edit         → Edit invoice

/invoices/\[id]/installments → Create installment schedule



/debtors                    → List of contractors

/debtors/new                → Add contractor (form)

/debtors/import             → CSV import

/debtors/\[id]               → Contractor profile + history + scoring

/debtors/\[id]/edit          → Edit contractor



/sequences                  → List of collection sequences

/sequences/new              → New sequence creator

/sequences/\[id]             → Edit sequence (drag \& drop steps)



/ai-generator               → AI message generator (ad-hoc, outside sequence)



/settings                   → Account settings

/settings/company           → Company data (for demands)

/settings/payment           → Payment data (bank account, PayU - placeholder)

/settings/integrations      → Integrations (KSeF, email) - placeholders

```



\### Navigation (Sidebar)

```

📊 Dashboard

📄 Receivables

&nbsp;  └─ All

&nbsp;  └─ Overdue

&nbsp;  └─ Upcoming

&nbsp;  └─ Import

👥 Contractors

&nbsp;  └─ All

&nbsp;  └─ Import

🔄 Sequences

🤖 AI Generator

⚙️ Settings

```



---



\## 🗄️ DATABASE SCHEMA (Supabase/PostgreSQL)



```sql

-- ============================================

-- USERS AND COMPANIES

-- ============================================



CREATE TABLE profiles (

&nbsp; id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

&nbsp; email TEXT NOT NULL,

&nbsp; full\_name TEXT,

&nbsp; -- Company data

&nbsp; company\_name TEXT NOT NULL,

&nbsp; company\_nip TEXT,

&nbsp; company\_address TEXT,

&nbsp; company\_city TEXT,

&nbsp; company\_postal\_code TEXT,

&nbsp; company\_phone TEXT,

&nbsp; company\_email TEXT,

&nbsp; -- Payment data (for demands)

&nbsp; bank\_account\_number TEXT,

&nbsp; bank\_name TEXT,

&nbsp; -- Settings

&nbsp; default\_sequence\_id UUID, -- default sequence for new contractors

&nbsp; send\_thank\_you\_on\_payment BOOLEAN DEFAULT TRUE,

&nbsp; interest\_rate DECIMAL(5,4) DEFAULT 0.155, -- 15.5% default

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),

&nbsp; updated\_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- COLLECTION SEQUENCES

-- ============================================



CREATE TABLE sequences (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

&nbsp; name TEXT NOT NULL,

&nbsp; description TEXT,

&nbsp; is\_default BOOLEAN DEFAULT FALSE, -- only one can be default

&nbsp; is\_system BOOLEAN DEFAULT FALSE,  -- system ones (Gentle, Standard, Quick)

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),

&nbsp; updated\_at TIMESTAMPTZ DEFAULT NOW()

);



CREATE TABLE sequence\_steps (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; sequence\_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,

&nbsp; step\_order INT NOT NULL,           -- step order

&nbsp; days\_offset INT NOT NULL,          -- -7 = 7 days before, +7 = 7 days after due date

&nbsp; channel TEXT NOT NULL,             -- 'email', 'sms', 'both'

&nbsp; -- Message content

&nbsp; email\_subject TEXT,

&nbsp; email\_body TEXT NOT NULL,

&nbsp; sms\_body TEXT,

&nbsp; -- Options

&nbsp; include\_payment\_link BOOLEAN DEFAULT TRUE,

&nbsp; include\_interest BOOLEAN DEFAULT FALSE,

&nbsp; -- AI generated or custom

&nbsp; is\_ai\_generated BOOLEAN DEFAULT FALSE,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),

&nbsp; updated\_at TIMESTAMPTZ DEFAULT NOW(),



&nbsp; UNIQUE(sequence\_id, step\_order)

);



-- ============================================

-- CONTRACTORS (DEBTORS)

-- ============================================



CREATE TABLE debtors (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

&nbsp; -- Company data

&nbsp; name TEXT NOT NULL,

&nbsp; nip TEXT,

&nbsp; email TEXT,

&nbsp; phone TEXT,

&nbsp; address TEXT,

&nbsp; city TEXT,

&nbsp; postal\_code TEXT,

&nbsp; contact\_person TEXT,

&nbsp; -- Sequence

&nbsp; default\_sequence\_id UUID REFERENCES sequences(id) ON DELETE SET NULL,

&nbsp; -- Scoring (calculated)

&nbsp; payment\_score INT DEFAULT 100,     -- 0-100

&nbsp; total\_invoices INT DEFAULT 0,

&nbsp; paid\_on\_time INT DEFAULT 0,

&nbsp; paid\_late INT DEFAULT 0,

&nbsp; unpaid INT DEFAULT 0,

&nbsp; -- Totals

&nbsp; total\_debt DECIMAL(12,2) DEFAULT 0,

&nbsp; overdue\_debt DECIMAL(12,2) DEFAULT 0,

&nbsp; -- Meta

&nbsp; notes TEXT,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),

&nbsp; updated\_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- INVOICES / RECEIVABLES

-- ============================================



CREATE TABLE invoices (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

&nbsp; debtor\_id UUID NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,

&nbsp; -- Invoice data

&nbsp; invoice\_number TEXT NOT NULL,

&nbsp; issue\_date DATE NOT NULL,

&nbsp; due\_date DATE NOT NULL,

&nbsp; amount DECIMAL(12,2) NOT NULL,

&nbsp; currency TEXT DEFAULT 'PLN',

&nbsp; description TEXT,

&nbsp; -- Payments

&nbsp; amount\_paid DECIMAL(12,2) DEFAULT 0,

&nbsp; paid\_at TIMESTAMPTZ,

&nbsp; -- Status

&nbsp; status TEXT NOT NULL DEFAULT 'pending',

&nbsp; -- pending, partial, paid, overdue, paused, written\_off

&nbsp; -- Sequence

&nbsp; sequence\_id UUID REFERENCES sequences(id) ON DELETE SET NULL,

&nbsp; sequence\_status TEXT DEFAULT 'active', -- active, paused, completed, stopped

&nbsp; current\_step\_index INT DEFAULT 0,

&nbsp; sequence\_paused\_at TIMESTAMPTZ,

&nbsp; sequence\_paused\_until TIMESTAMPTZ,

&nbsp; -- Calculated

&nbsp; days\_overdue INT GENERATED ALWAYS AS (

&nbsp;   CASE WHEN due\_date < CURRENT\_DATE AND status NOT IN ('paid', 'written\_off')

&nbsp;   THEN CURRENT\_DATE - due\_date

&nbsp;   ELSE 0 END

&nbsp; ) STORED,

&nbsp; interest\_amount DECIMAL(12,2) DEFAULT 0,

&nbsp; -- Payment link

&nbsp; payment\_link TEXT,

&nbsp; payment\_link\_expires\_at TIMESTAMPTZ,

&nbsp; -- Meta

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),

&nbsp; updated\_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- INSTALLMENT PLANS

-- ============================================



CREATE TABLE installment\_plans (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; invoice\_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

&nbsp; user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

&nbsp; total\_installments INT NOT NULL,

&nbsp; notes TEXT,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW()

);



CREATE TABLE installments (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; plan\_id UUID NOT NULL REFERENCES installment\_plans(id) ON DELETE CASCADE,

&nbsp; installment\_number INT NOT NULL,

&nbsp; amount DECIMAL(12,2) NOT NULL,

&nbsp; due\_date DATE NOT NULL,

&nbsp; status TEXT DEFAULT 'pending', -- pending, paid, overdue

&nbsp; paid\_at TIMESTAMPTZ,

&nbsp; -- Own sequence for installment

&nbsp; sequence\_id UUID REFERENCES sequences(id) ON DELETE SET NULL,

&nbsp; sequence\_status TEXT DEFAULT 'active',

&nbsp; current\_step\_index INT DEFAULT 0,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW(),



&nbsp; UNIQUE(plan\_id, installment\_number)

);



-- ============================================

-- ACTION HISTORY

-- ============================================



CREATE TABLE collection\_actions (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; invoice\_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

&nbsp; installment\_id UUID REFERENCES installments(id) ON DELETE CASCADE,

&nbsp; user\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

&nbsp; -- Action type

&nbsp; action\_type TEXT NOT NULL,

&nbsp; -- 'step\_executed', 'step\_skipped', 'sequence\_paused', 'sequence\_resumed',

&nbsp; -- 'payment\_received', 'payment\_partial', 'thank\_you\_sent',

&nbsp; -- 'manual\_email', 'manual\_sms', 'note', 'ai\_generated'

&nbsp; -- Details

&nbsp; sequence\_step\_id UUID REFERENCES sequence\_steps(id),

&nbsp; channel TEXT,               -- 'email', 'sms'

&nbsp; email\_subject TEXT,

&nbsp; content TEXT,

&nbsp; recipient\_email TEXT,

&nbsp; recipient\_phone TEXT,

&nbsp; -- Send status

&nbsp; status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'delivered', 'failed'

&nbsp; sent\_at TIMESTAMPTZ,

&nbsp; error\_message TEXT,

&nbsp; -- Meta

&nbsp; metadata JSONB,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- SCHEDULED JOBS (for sequences)

-- ============================================



CREATE TABLE scheduled\_steps (

&nbsp; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&nbsp; invoice\_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

&nbsp; installment\_id UUID REFERENCES installments(id) ON DELETE CASCADE,

&nbsp; sequence\_step\_id UUID NOT NULL REFERENCES sequence\_steps(id) ON DELETE CASCADE,

&nbsp; scheduled\_for DATE NOT NULL,

&nbsp; status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'skipped', 'cancelled'

&nbsp; executed\_at TIMESTAMPTZ,

&nbsp; created\_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- INDEXES

-- ============================================



CREATE INDEX idx\_sequences\_user\_id ON sequences(user\_id);

CREATE INDEX idx\_sequence\_steps\_sequence\_id ON sequence\_steps(sequence\_id);

CREATE INDEX idx\_debtors\_user\_id ON debtors(user\_id);

CREATE INDEX idx\_debtors\_nip ON debtors(nip);

CREATE INDEX idx\_invoices\_user\_id ON invoices(user\_id);

CREATE INDEX idx\_invoices\_debtor\_id ON invoices(debtor\_id);

CREATE INDEX idx\_invoices\_status ON invoices(status);

CREATE INDEX idx\_invoices\_due\_date ON invoices(due\_date);

CREATE INDEX idx\_invoices\_sequence\_status ON invoices(sequence\_status);

CREATE INDEX idx\_installments\_plan\_id ON installments(plan\_id);

CREATE INDEX idx\_installments\_due\_date ON installments(due\_date);

CREATE INDEX idx\_collection\_actions\_invoice\_id ON collection\_actions(invoice\_id);

CREATE INDEX idx\_scheduled\_steps\_scheduled\_for ON scheduled\_steps(scheduled\_for);

CREATE INDEX idx\_scheduled\_steps\_status ON scheduled\_steps(status);



-- ============================================

-- ROW LEVEL SECURITY

-- ============================================



ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

ALTER TABLE sequence\_steps ENABLE ROW LEVEL SECURITY;

ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE installment\_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

ALTER TABLE collection\_actions ENABLE ROW LEVEL SECURITY;

ALTER TABLE scheduled\_steps ENABLE ROW LEVEL SECURITY;



-- Policies (user sees only their own data)

CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own sequences" ON sequences FOR ALL USING (auth.uid() = user\_id);

CREATE POLICY "Users can manage own sequence\_steps" ON sequence\_steps FOR ALL

&nbsp; USING (sequence\_id IN (SELECT id FROM sequences WHERE user\_id = auth.uid()));

CREATE POLICY "Users can manage own debtors" ON debtors FOR ALL USING (auth.uid() = user\_id);

CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user\_id);

CREATE POLICY "Users can manage own installment\_plans" ON installment\_plans FOR ALL USING (auth.uid() = user\_id);

CREATE POLICY "Users can manage own installments" ON installments FOR ALL

&nbsp; USING (plan\_id IN (SELECT id FROM installment\_plans WHERE user\_id = auth.uid()));

CREATE POLICY "Users can manage own actions" ON collection\_actions FOR ALL USING (auth.uid() = user\_id);

CREATE POLICY "Users can manage own scheduled\_steps" ON scheduled\_steps FOR ALL

&nbsp; USING (invoice\_id IN (SELECT id FROM invoices WHERE user\_id = auth.uid()));

```



---



\## 🤖 AI FEATURES (v1.0 - MOCKED)



\### Message Content Generator



In MVP version, AI generator will be \*\*simulated\*\* - we return predefined templates with variations. Real API (OpenAI/Claude) will be added in v2.



```typescript

// Placeholders available in templates:

const PLACEHOLDERS = {

&nbsp; '{{debtor\_name}}': 'Contractor name',

&nbsp; '{{invoice\_number}}': 'Invoice number',

&nbsp; '{{amount}}': 'Invoice amount',

&nbsp; '{{amount\_with\_interest}}': 'Amount with interest',

&nbsp; '{{interest\_amount}}': 'Interest amount only',

&nbsp; '{{due\_date}}': 'Payment due date',

&nbsp; '{{days\_overdue}}': 'Days overdue',

&nbsp; '{{company\_name}}': 'Your company name',

&nbsp; '{{bank\_account}}': 'Account number',

&nbsp; '{{payment\_link}}': 'Online payment link',

};

```



\### Default Templates for "Standard" Sequence



\*\*IMPORTANT: Keep message content in Polish - this is for Polish customers!\*\*



```typescript

const DEFAULT\_SEQUENCE\_STEPS = \[

&nbsp; {

&nbsp;   days\_offset: -7,

&nbsp;   channel: 'email',

&nbsp;   email\_subject: 'Przypomnienie o zbliżającym się terminie płatności',

&nbsp;   email\_body: `Dzień dobry,



Uprzejmie przypominamy, że za tydzień, tj. {{due\_date}}, mija termin płatności faktury nr {{invoice\_number}} na kwotę {{amount}}.



Jeśli płatność została już zrealizowana, prosimy zignorować tę wiadomość.



Z poważaniem,

{{company\_name}}`,

&nbsp;   include\_payment\_link: false,

&nbsp;   include\_interest: false,

&nbsp; },

&nbsp; {

&nbsp;   days\_offset: -1,

&nbsp;   channel: 'email',

&nbsp;   email\_subject: 'Jutro mija termin płatności - {{invoice\_number}}',

&nbsp;   email\_body: `Dzień dobry,



Przypominamy, że jutro ({{due\_date}}) mija termin płatności faktury nr {{invoice\_number}} na kwotę {{amount}}.



Aby uniknąć naliczania odsetek, prosimy o terminową wpłatę.



{{payment\_link}}



Z poważaniem,

{{company\_name}}`,

&nbsp;   include\_payment\_link: true,

&nbsp;   include\_interest: false,

&nbsp; },

&nbsp; {

&nbsp;   days\_offset: 1,

&nbsp;   channel: 'email',

&nbsp;   email\_subject: 'Termin płatności minął - {{invoice\_number}}',

&nbsp;   email\_body: `Dzień dobry,



Informujemy, że wczoraj minął termin płatności faktury nr {{invoice\_number}} na kwotę {{amount}}.



Prosimy o pilne uregulowanie należności.



{{payment\_link}}



Z poważaniem,

{{company\_name}}`,

&nbsp;   include\_payment\_link: true,

&nbsp;   include\_interest: false,

&nbsp; },

&nbsp; {

&nbsp;   days\_offset: 7,

&nbsp;   channel: 'both',

&nbsp;   email\_subject: 'Wezwanie do zapłaty - faktura przeterminowana',

&nbsp;   email\_body: `Szanowni Państwo,



Faktura nr {{invoice\_number}} jest przeterminowana o {{days\_overdue}} dni.



Kwota do zapłaty: {{amount}}



Prosimy o niezwłoczne uregulowanie należności. W przypadku problemów z płatnością, prosimy o kontakt w celu ustalenia warunków spłaty.



{{payment\_link}}



Z poważaniem,

{{company\_name}}`,

&nbsp;   sms\_body: 'Faktura {{invoice\_number}} przeterminowana o {{days\_overdue}} dni. Kwota: {{amount}}. Prosimy o pilną wpłatę. {{company\_name}}',

&nbsp;   include\_payment\_link: true,

&nbsp;   include\_interest: false,

&nbsp; },

&nbsp; {

&nbsp;   days\_offset: 14,

&nbsp;   channel: 'email',

&nbsp;   email\_subject: 'WEZWANIE DO ZAPŁATY z odsetkami - {{invoice\_number}}',

&nbsp;   email\_body: `Szanowni Państwo,



Pomimo wcześniejszych wezwań, faktura nr {{invoice\_number}} pozostaje nieopłacona.



Należność główna: {{amount}}

Naliczone odsetki: {{interest\_amount}}

RAZEM DO ZAPŁATY: {{amount\_with\_interest}}



Prosimy o uregulowanie pełnej kwoty w ciągu 7 dni.



{{payment\_link}}



Z poważaniem,

{{company\_name}}`,

&nbsp;   include\_payment\_link: true,

&nbsp;   include\_interest: true,

&nbsp; },

&nbsp; {

&nbsp;   days\_offset: 30,

&nbsp;   channel: 'email',

&nbsp;   email\_subject: 'OSTATECZNE WEZWANIE DO ZAPŁATY - {{invoice\_number}}',

&nbsp;   email\_body: `Szanowni Państwo,



Niniejszym wzywamy do NATYCHMIASTOWEJ zapłaty należności wynikającej z faktury nr {{invoice\_number}}.



Należność główna: {{amount}}

Naliczone odsetki: {{interest\_amount}}

RAZEM DO ZAPŁATY: {{amount\_with\_interest}}



W przypadku braku wpłaty w terminie 7 dni od otrzymania niniejszego wezwania, sprawa zostanie przekazana do dalszego postępowania windykacyjnego, co wiązać się będzie z dodatkowymi kosztami.



{{payment\_link}}



{{company\_name}}`,

&nbsp;   include\_payment\_link: true,

&nbsp;   include\_interest: true,

&nbsp; },

];

```



\### "Thank You for Payment" Email



```typescript

const THANK\_YOU\_EMAIL = {

&nbsp; subject: 'Potwierdzenie otrzymania płatności - {{invoice\_number}}',

&nbsp; body: `Dzień dobry,



Potwierdzamy otrzymanie płatności za fakturę nr {{invoice\_number}}.



Dziękujemy za terminowe uregulowanie należności i liczymy na dalszą owocną współpracę.



Z poważaniem,

{{company\_name}}`,

};

```



---



\## 📧 INTEGRATIONS (v1.0 - MOCKED)



\### Email (SendGrid mock)

```typescript

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {

&nbsp; console.log('📧 \[MOCK] Sending email:', {

&nbsp;   to: params.to,

&nbsp;   subject: params.subject,

&nbsp; });



&nbsp; await sleep(500);

&nbsp; const success = Math.random() > 0.05; // 95% success rate



&nbsp; return {

&nbsp;   success,

&nbsp;   messageId: success ? `mock\_${Date.now()}` : null,

&nbsp;   error: success ? null : 'Simulated send error'

&nbsp; };

}

```



\### SMS (mock)

```typescript

export async function sendSms(params: SendSmsParams): Promise<SmsResult> {

&nbsp; console.log('📱 \[MOCK] Sending SMS:', {

&nbsp;   to: params.phone,

&nbsp;   content: params.content.substring(0, 50) + '...'

&nbsp; });



&nbsp; await sleep(300);

&nbsp; return { success: true, messageId: `sms\_mock\_${Date.now()}` };

}

```



\### Payment Link (mock)

```typescript

export function generatePaymentLink(invoice: Invoice): string {

&nbsp; // V1: Mock - return placeholder

&nbsp; const mockLink = `https://pay.vindycaition.pl/mock/${invoice.id}`;

&nbsp; console.log('💳 \[MOCK] Generated payment link:', mockLink);

&nbsp; return mockLink;



&nbsp; // V2: Real PayU/Przelewy24 integration

}

```



---



\## ✅ TASKS TO COMPLETE (CHECKLIST)



\### Phase 1: Project Setup

\- \[ ] Initialize Next.js 14 project with TypeScript

\- \[ ] Configure Tailwind CSS + shadcn/ui

\- \[ ] Configure ESLint + Prettier

\- \[ ] Configure Supabase (local or cloud)

\- \[ ] Run database migrations (full schema)

\- \[ ] Configure environment variables (.env.local)

\- \[ ] Seed default sequences (3 templates)



\### Phase 2: Authentication

\- \[ ] Login screen (/login)

\- \[ ] Registration screen (/register) with company data

\- \[ ] Password reset (/forgot-password)

\- \[ ] Middleware for route protection

\- \[ ] Profile completion after registration



\### Phase 3: Layout and Navigation

\- \[ ] Sidebar with navigation (collapsible)

\- \[ ] Header with user menu

\- \[ ] Responsive layout (mobile hamburger)

\- \[ ] Breadcrumbs



\### Phase 4: Dashboard

\- \[ ] KPI cards (receivables, overdue, recovered, on time)

\- \[ ] ROI widget "How much you've saved"

\- \[ ] Cash flow prediction widget

\- \[ ] Receivables over time chart (Recharts)

\- \[ ] List of invoices requiring attention

\- \[ ] Quick actions



\### Phase 5: Collection Sequences Module

\- \[ ] Sequences list (/sequences)

\- \[ ] New sequence creator (/sequences/new)

\- \[ ] Sequence editor with timeline UI (/sequences/\[id])

\- \[ ] Drag \& drop steps

\- \[ ] Step form (days, channel, content, options)

\- \[ ] Copy sequence

\- \[ ] Set default



\### Phase 6: Contractors Module

\- \[ ] Contractors list with scoring

\- \[ ] Add/edit form

\- \[ ] CSV import

\- \[ ] Contractor profile with history

\- \[ ] Assign default sequence

\- \[ ] Calculate and display scoring



\### Phase 7: Invoices Module

\- \[ ] Invoice list with filtering and sorting

\- \[ ] Add invoice form (with contractor and sequence selection)

\- \[ ] CSV import

\- \[ ] Invoice details view

\- \[ ] Sequence timeline on invoice

\- \[ ] Actions: mark paid, pause, skip, resume

\- \[ ] Edit invoice

\- \[ ] Interest calculator (auto)

\- \[ ] Payment link (mock)



\### Phase 8: Installments Module

\- \[ ] Create installment schedule for invoice

\- \[ ] Installment list with own statuses

\- \[ ] Sequence for each installment



\### Phase 9: AI Generator (ad-hoc)

\- \[ ] Generator interface

\- \[ ] Select contractor, invoice, tone

\- \[ ] Preview and edit generated message

\- \[ ] Send (mock)



\### Phase 10: Settings

\- \[ ] Edit company data

\- \[ ] Payment data (bank account)

\- \[ ] Default settings (sequence, thank you email)

\- \[ ] Placeholder for integrations



\### Phase 11: Scheduler (cron job)

\- \[ ] Edge Function to check scheduled\_steps

\- \[ ] Automatic message sending

\- \[ ] Auto-stop on payment

\- \[ ] Thank you email



\### Phase 12: Polish \& QA

\- \[ ] Loading states (Skeleton)

\- \[ ] Empty states

\- \[ ] Error handling

\- \[ ] Toast notifications

\- \[ ] Responsiveness

\- \[ ] Demo data seed



---



\## 📁 PROJECT STRUCTURE



```

vindycaition/

├── src/

│   ├── app/

│   │   ├── (auth)/

│   │   │   ├── login/page.tsx

│   │   │   ├── register/page.tsx

│   │   │   └── forgot-password/page.tsx

│   │   ├── (dashboard)/

│   │   │   ├── layout.tsx

│   │   │   ├── dashboard/page.tsx

│   │   │   ├── invoices/

│   │   │   │   ├── page.tsx

│   │   │   │   ├── new/page.tsx

│   │   │   │   ├── import/page.tsx

│   │   │   │   └── \[id]/

│   │   │   │       ├── page.tsx

│   │   │   │       ├── edit/page.tsx

│   │   │   │       └── installments/page.tsx

│   │   │   ├── debtors/

│   │   │   │   ├── page.tsx

│   │   │   │   ├── new/page.tsx

│   │   │   │   ├── import/page.tsx

│   │   │   │   └── \[id]/

│   │   │   │       ├── page.tsx

│   │   │   │       └── edit/page.tsx

│   │   │   ├── sequences/

│   │   │   │   ├── page.tsx

│   │   │   │   ├── new/page.tsx

│   │   │   │   └── \[id]/page.tsx

│   │   │   ├── ai-generator/page.tsx

│   │   │   └── settings/

│   │   │       ├── page.tsx

│   │   │       ├── company/page.tsx

│   │   │       ├── payment/page.tsx

│   │   │       └── integrations/page.tsx

│   │   ├── api/

│   │   │   ├── cron/

│   │   │   │   └── process-sequences/route.ts

│   │   │   └── webhooks/

│   │   │       └── payment/route.ts

│   │   ├── layout.tsx

│   │   ├── page.tsx

│   │   └── globals.css

│   ├── components/

│   │   ├── ui/                         # shadcn/ui

│   │   ├── layout/

│   │   │   ├── sidebar.tsx

│   │   │   ├── header.tsx

│   │   │   └── mobile-nav.tsx

│   │   ├── dashboard/

│   │   │   ├── kpi-cards.tsx

│   │   │   ├── roi-widget.tsx

│   │   │   ├── cashflow-widget.tsx

│   │   │   ├── debt-chart.tsx

│   │   │   └── urgent-invoices.tsx

│   │   ├── sequences/

│   │   │   ├── sequence-list.tsx

│   │   │   ├── sequence-editor.tsx

│   │   │   ├── sequence-timeline.tsx

│   │   │   ├── step-form.tsx

│   │   │   └── step-card.tsx

│   │   ├── invoices/

│   │   │   ├── invoice-list.tsx

│   │   │   ├── invoice-form.tsx

│   │   │   ├── invoice-details.tsx

│   │   │   ├── invoice-timeline.tsx

│   │   │   ├── invoice-actions.tsx

│   │   │   ├── status-badge.tsx

│   │   │   ├── interest-calculator.tsx

│   │   │   └── payment-link.tsx

│   │   ├── debtors/

│   │   │   ├── debtor-list.tsx

│   │   │   ├── debtor-form.tsx

│   │   │   ├── debtor-profile.tsx

│   │   │   └── score-badge.tsx

│   │   ├── installments/

│   │   │   ├── installment-form.tsx

│   │   │   └── installment-list.tsx

│   │   ├── ai-generator/

│   │   │   ├── generator-form.tsx

│   │   │   ├── message-preview.tsx

│   │   │   └── send-dialog.tsx

│   │   ├── import/

│   │   │   ├── csv-uploader.tsx

│   │   │   ├── import-preview.tsx

│   │   │   └── import-mapping.tsx

│   │   └── shared/

│   │       ├── data-table.tsx

│   │       ├── empty-state.tsx

│   │       ├── loading-skeleton.tsx

│   │       ├── page-header.tsx

│   │       ├── confirm-dialog.tsx

│   │       └── currency-input.tsx

│   ├── lib/

│   │   ├── supabase/

│   │   │   ├── client.ts

│   │   │   ├── server.ts

│   │   │   └── middleware.ts

│   │   ├── sequences/

│   │   │   ├── scheduler.ts

│   │   │   ├── executor.ts

│   │   │   └── templates.ts

│   │   ├── scoring/

│   │   │   └── calculate-score.ts

│   │   ├── interest/

│   │   │   └── calculate-interest.ts

│   │   ├── cashflow/

│   │   │   └── predict-cashflow.ts

│   │   ├── email/

│   │   │   └── send-email.ts

│   │   ├── sms/

│   │   │   └── send-sms.ts

│   │   ├── payment/

│   │   │   └── generate-link.ts

│   │   ├── import/

│   │   │   ├── parse-csv.ts

│   │   │   └── validate-import.ts

│   │   └── utils/

│   │       ├── format-currency.ts

│   │       ├── format-date.ts

│   │       ├── placeholders.ts

│   │       └── cn.ts

│   ├── hooks/

│   │   ├── use-invoices.ts

│   │   ├── use-debtors.ts

│   │   ├── use-sequences.ts

│   │   └── use-user.ts

│   ├── types/

│   │   ├── database.ts

│   │   ├── invoice.ts

│   │   ├── debtor.ts

│   │   ├── sequence.ts

│   │   └── index.ts

│   └── constants/

│       ├── invoice-statuses.ts

│       ├── channels.ts

│       └── default-sequences.ts

├── supabase/

│   ├── migrations/

│   │   └── 001\_initial\_schema.sql

│   ├── functions/

│   │   └── process-sequences/

│   │       └── index.ts

│   └── seed.sql

├── public/

│   └── logo.svg

├── .env.local.example

├── package.json

├── tsconfig.json

├── tailwind.config.ts

├── next.config.js

└── README.md

```



---



\## 🎬 INSTRUCTIONS FOR ANTIGRAVITY



\### Work Mode

1\. Use \*\*Plan\*\* mode for each phase

2\. Show action plan before implementation

3\. After each phase, generate Artifact with progress



\### Important Rules

\- Code comments in English

\- \*\*UI and messages in Polish\*\* (this is for Polish market!)

\- Use shadcn/ui wherever possible

\- TypeScript strict mode

\- Each component in separate file

\- Named exports



\### Getting Started

Start with \*\*Phase 1: Project Setup\*\*.



Good luck! 🚀

