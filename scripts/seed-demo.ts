
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env vars manually from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envConfig = fs.readFileSync(envPath, "utf8");
const envVars: Record<string, string> = {};

envConfig.split("\n").forEach((line) => {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        if (key && value) envVars[key] = value;
    }
});

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const USER_EMAIL = "demo@vindycaition.com";
const USER_PASSWORD = "Password123!";

const LOGO_BUCKET = "avatars"; // Assuming this bucket exists, otherwise skip or handle

async function seed() {
    console.log("🌱 Starting seed...");

    // 1. Create or Get User
    let userId: string;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find((u) => u.email === USER_EMAIL);

    if (existingUser) {
        console.log("User exists, reusing...");
        userId = existingUser.id;
    } else {
        console.log("Creating new user...");
        try {
            const { data: newUser, error: createError } =
                await supabase.auth.admin.createUser({
                    email: USER_EMAIL,
                    password: USER_PASSWORD,
                    email_confirm: true,
                    user_metadata: {
                        company_name: "Software House Pro Sp. z o.o.",
                        full_name: "Demo User"
                    }
                });

            if (createError) throw createError;
            userId = newUser.user.id;
        } catch (e: any) {
            console.log("Create failed with error:", e.message);
            console.log("Attempting to fallback to ANY existing user...");

            const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
            if (allUsers?.users.length > 0) {
                const fallbackUser = allUsers.users[0];
                console.log(`⚠️ Using fallback user: ${fallbackUser.email} (${fallbackUser.id})`);
                userId = fallbackUser.id;
            } else {
                console.error("No users found in database. Cannot seed.");
                throw e;
            }
        }
    }

    // 2. Clear old data for this user (optional, but good for cleanliness)
    await supabase.from("invoices").delete().eq("user_id", userId);
    await supabase.from("cost_invoices").delete().eq("user_id", userId);
    await supabase.from("debtors").delete().eq("user_id", userId);
    await supabase.from("collection_actions").delete().eq("user_id", userId);
    await supabase.from("history").delete().eq("user_id", userId); // Assuming history table has user_id or linked

    // 3. Update Profile
    await supabase
        .from("profiles")
        .update({
            company_name: "Software House Pro Sp. z o.o.",
            nip: "5252528734",
            street: "Złota 44",
            city: "Warszawa",
            postal_code: "00-120",
            bank_account: "12 1020 1234 0000 0002 0304 0506",
            onboarding_completed: true,
            sms_enabled: true,
            voice_enabled: true,
            subscription_tier: "growth", // Assuming this plan exists
        })
        .eq("id", userId);

    // 4. Create Debtors
    const debtorsData = [
        {
            name: "Budex Sp. z o.o.",
            nip: "1234563218",
            email: "ksiegowosc@budex.pl", // Mock
            phone_number: "+48600100200",
            street: "Budowlana 15",
            city: "Kraków",
            postal_code: "30-001",
            payment_score: 45,
        },
        {
            name: "Sklep Wielobranżowy 'U Ani'",
            nip: "8989891234",
            email: "ania.sklep@gmail.com",
            phone_number: "+48500200300",
            street: "Długa 5",
            city: "Gdańsk",
            postal_code: "80-002",
            payment_score: 90,
        },
        {
            name: "Transport Logistyka S.A.",
            nip: "5215215212",
            email: "faktury@translog.com",
            phone_number: "+48700800900",
            street: "Portowa 1",
            city: "Gdynia",
            postal_code: "81-003",
            payment_score: 15, // Problematic
        },
        {
            name: "Marketing Studio",
            nip: "7776665544",
            email: "hello@marketingstudio.pl",
            phone_number: "+48690123123",
            street: "Słoneczna 12",
            city: "Wrocław",
            postal_code: "50-004",
            payment_score: 75,
        },
        {
            name: "Jan Kowalski IT Services",
            nip: "9998887766",
            email: "jan.kowalski@it.pl",
            phone_number: "+48666555444",
            street: "Prosta 2",
            city: "Poznań",
            postal_code: "60-005",
            payment_score: 98,
        },
    ];

    const debtorsMap: Record<string, string> = {};

    for (const d of debtorsData) {
        const { data } = await supabase
            .from("debtors")
            .insert({ ...d, user_id: userId })
            .select()
            .single();
        if (data) debtorsMap[d.name] = data.id;
    }

    // Helper date function
    const daysAgo = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split("T")[0]; // YYYY-MM-DD
    };
    const daysFuture = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    };

    // 5. Create Sales Invoices + Actions + History
    // Statuses: 'paid', 'overdue', 'pending' based on due_date and payment
    // Real logic usually handled by triggers/calc, but we insert raw

    const invoicesData = [
        // --- OVERDUE --- (The meat of the app)
        {
            debtor: "Transport Logistyka S.A.",
            number: "FV/2025/11/05",
            amount: 12500.0,
            due_date: daysAgo(45), // Very overdue
            issue_date: daysAgo(60),
            status: "overdue",
            actions: [
                { type: "email", status: "sent", daysAgo: 40 },
                { type: "sms", status: "sent", daysAgo: 30 },
                { type: "email", status: "sent", daysAgo: 15 },
                { type: "call", status: "completed", daysAgo: 5 }, // 'completed' might be 'sent' or custom
            ],
        },
        {
            debtor: "Budex Sp. z o.o.",
            number: "FV/2025/12/10",
            amount: 3450.50,
            due_date: daysAgo(10), // Freshly overdue
            issue_date: daysAgo(24),
            status: "overdue",
            actions: [
                { type: "email", status: "sent", daysAgo: 8 },
                { type: "sms", status: "failed", daysAgo: 8 }, // Failed example
            ],
        },
        {
            debtor: "Budex Sp. z o.o.",
            number: "FV/2026/01/02",
            amount: 1200.00,
            due_date: daysAgo(2), // Just became overdue
            issue_date: daysAgo(16),
            status: "overdue",
            actions: [],
        },

        // --- PAID ---
        {
            debtor: "Sklep Wielobranżowy 'U Ani'",
            number: "FV/2025/10/01",
            amount: 500.00,
            due_date: daysAgo(90),
            issue_date: daysAgo(100),
            status: "paid",
            paid_at: daysAgo(92), // Paid on time-ish
        },
        {
            debtor: "Jan Kowalski IT Services",
            number: "FV/2025/12/15",
            amount: 8000.00,
            due_date: daysAgo(2),
            issue_date: daysAgo(16),
            status: "paid", // Paid early
            paid_at: daysAgo(5),
        },

        // --- PENDING / DUE SOON ---
        {
            debtor: "Marketing Studio",
            number: "FV/2026/01/20",
            amount: 4500.00,
            due_date: daysFuture(5), // Due in 5 days
            issue_date: daysAgo(9),
            status: "pending",
        },
        {
            debtor: "Jan Kowalski IT Services",
            number: "FV/2026/01/25",
            amount: 25000.00, // Big one
            due_date: daysFuture(14),
            issue_date: daysAgo(1),
            status: "pending",
        }
    ];

    for (const inv of invoicesData) {
        if (!debtorsMap[inv.debtor]) continue;

        const { data: insertedInv } = await supabase
            .from("invoices")
            .insert({
                user_id: userId,
                debtor_id: debtorsMap[inv.debtor],
                invoice_number: inv.number,
                amount: inv.amount,
                issue_date: inv.issue_date,
                due_date: inv.due_date,
                status: inv.status as any, // Cast to avoid TS enum issues if simple string
                paid_at: inv.paid_at || null,
                amount_paid: inv.status === 'paid' ? inv.amount : 0,
            })
            .select()
            .single();

        if (insertedInv && inv.actions) {
            // Log actions
            for (const action of inv.actions) {
                await supabase.from("collection_actions").insert({
                    user_id: userId,
                    invoice_id: insertedInv.id,
                    action_type: action.type,
                    status: action.status,
                    sent_at: new Date(Date.now() - action.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
                    metadata: { demo: true }
                });

                // Also log to history to be safe/consistent
                // (Depending on app logic history might be separate or same table, 
                // usually history tracks events like "sent", "paid")
            }
        }
    }

    // 6. Create Cost Invoices (Expenses)
    const costInvoicesData = [
        {
            contractor: "Google Ireland Ltd",
            nip: "IE6388047V",
            number: "G/2025/12412",
            amount: 150.00,
            currency: "PLN",
            date: daysAgo(20),
            due_date: daysAgo(5),
            status: "paid",
            category: "Software"
        },
        {
            contractor: "Amazon Web Services",
            nip: "US12345678",
            number: "AWS-EU-12345",
            amount: 456.78,
            currency: "PLN", // Simplified currency
            date: daysAgo(15),
            due_date: daysAgo(1),
            status: "overdue", // Forgot to pay
            category: "Hosting"
        },
        {
            contractor: "Accounting Pro Biuro Rachunkowe",
            nip: "1112223344",
            number: "F/12/2025",
            amount: 1200.00,
            currency: "PLN",
            date: daysAgo(10),
            due_date: daysFuture(4),
            status: "pending",
            category: "Accounting"
        },
        {
            contractor: "Office Rent Sp. z o.o.",
            nip: "5556667788",
            number: "NC/01/2026",
            amount: 3500.00,
            currency: "PLN",
            date: daysAgo(5),
            due_date: daysFuture(10),
            status: "pending",
            category: "Rent"
        }
    ];

    for (const cost of costInvoicesData) {
        await supabase.from("cost_invoices").insert({
            user_id: userId,
            contractor_name: cost.contractor,
            contractor_nip: cost.nip,
            invoice_number: cost.number,
            amount: cost.amount,
            currency: cost.currency,
            issue_date: cost.date,
            due_date: cost.due_date,
            status: cost.status,
            category: cost.category
        });
    }

    // 7. Insert aggregated history events (for the dashboard chart)
    // This simulates the 'history' table which feeds the ActivityChart/Timeline
    const historyEvents = [
        { type: 'invoice_created', daysAgo: 60, details: "Wystawiono fakturę FV/2025/11/05" },
        { type: 'invoice_created', daysAgo: 24, details: "Wystawiono fakturę FV/2025/12/10" },
        { type: 'email_sent', daysAgo: 40, details: "Wysłano przypomnienie email do Transport Logistyka" },
        { type: 'sms_sent', daysAgo: 30, details: "Wysłano SMS do Transport Logistyka" },
        { type: 'payment_received', daysAgo: 92, details: "Otrzymano płatność 500.00 PLN od Sklep U Ani" },
        // Add a bunch of recent activity
        { type: 'email_sent', daysAgo: 0, details: "Wysłano wezwanie do zapłaty (Budex)" },
        { type: 'sms_sent', daysAgo: 0, details: "Wysłano SMS (Budex)" },
    ];

    //   // Note: If you don't have a specific `history` table and rely on `collection_actions` + `invoices` 
    //   // for the history page, you can skip this. But if you have a literal `history` table:
    //   for (const evt of historyEvents) {
    //       await supabase.from("history").insert({
    //           user_id: userId,
    //           event_type: evt.type,
    //           description: evt.details,
    //           created_at: new Date(Date.now() - evt.daysAgo * 24 * 60 * 60 * 1000).toISOString()
    //       });
    //   }

    console.log("✅ Seed completed successfully!");
    console.log(`User: ${USER_EMAIL}`);
    console.log(`Pass: ${USER_PASSWORD}`);
}

seed().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
});
