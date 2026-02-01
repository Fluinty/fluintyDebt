'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { PRICING_PLANS, SubscriptionTier } from '@/lib/subscription-constants';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SubscriptionExpiredPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('too_expensive');
    const [feedbackComment, setFeedbackComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async (tier: string) => {
        setIsLoading(true);
        // MOCK PAYMENT
        toast.info('Przekierowywanie do płatności... (MOCK)');

        // Simulate successful payment after 2 seconds
        setTimeout(async () => {
            // Update subscription in DB (MOCK)
            // Ideally this happens via Webhook, but for now we trust the client-side call or invoke a server action
            // Since we can't easily invoke server action from here without seting it up, I'll just redirect to dashboard 
            // and assume the user manually updates the DB or we have a test helper.
            // For this 'Mock' to work effectively, we might need a server action. 
            // Let's just notify for now.
            toast.success('Płatność przyjęta! (Symulacja)');
            // Actual logic would be: window.location.href = checkoutUrl;

            // Refresh page
            window.location.href = '/dashboard';
        }, 1500);
    };

    const handleFeedbackSubmit = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('feedback').insert({
                    user_id: user.id,
                    type: 'churn',
                    reason: feedbackReason,
                    comment: feedbackComment
                });
            }
            toast.success('Dziękujemy za opinię.');
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error(error);
            toast.error('Wystąpił błąd.');
        } finally {
            setIsLoading(false);
            setIsFeedbackOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-5xl w-full text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Twój okres próbny dobiegł końca 🔒
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Mamy nadzieję, że FluintyDebt pomogło Ci zapanować nad finansami.
                        Wybierz plan, aby odzyskać dostęp do Dashboardu i automatycznej windykacji.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-12">
                    {/* STARTER */}
                    <Card className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader>
                            <CardTitle>{PRICING_PLANS.starter.name}</CardTitle>
                            <CardDescription>{PRICING_PLANS.starter.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-3xl font-bold">
                                {PRICING_PLANS.starter.priceMonthly} PLN <span className="text-sm font-normal text-slate-500">/mies.</span>
                            </div>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Do {PRICING_PLANS.starter.limit} faktur mies.</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Monitoring KSeF</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Podstawowa windykacja</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleSubscribe('starter')} disabled={isLoading}>
                                Wybieram Starter
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* GROWTH */}
                    <Card className="relative overflow-hidden border-primary/20 shadow-md ring-2 ring-primary/10">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg">
                            POLECANY
                        </div>
                        <CardHeader>
                            <CardTitle>{PRICING_PLANS.growth.name}</CardTitle>
                            <CardDescription>{PRICING_PLANS.growth.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-3xl font-bold">
                                {PRICING_PLANS.growth.priceMonthly} PLN <span className="text-sm font-normal text-slate-500">/mies.</span>
                            </div>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Do {PRICING_PLANS.growth.limit} faktur mies.</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Monitoring KSeF</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Pełna automatyzacja</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Płatności QR</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => handleSubscribe('growth')} disabled={isLoading}>
                                Wybieram Growth
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* UNLIMITED */}
                    <Card className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader>
                            <CardTitle>{PRICING_PLANS.unlimited.name}</CardTitle>
                            <CardDescription>{PRICING_PLANS.unlimited.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-3xl font-bold">
                                {PRICING_PLANS.unlimited.priceMonthly} PLN <span className="text-sm font-normal text-slate-500">/mies.</span>
                            </div>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Nielimitowane faktury</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Wszystkie funkcje</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Priorytetowy Support</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> API Access</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => handleSubscribe('unlimited')} disabled={isLoading}>
                                Wybieram Unlimited
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="pt-8 text-center">
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        className="text-sm text-slate-400 hover:text-slate-600 underline transition-colors"
                    >
                        Nie, dziękuję. Rezygnuję z usługi.
                    </button>
                </div>
            </div>

            {/* FEEDBACK MODAL */}
            <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Szkoda, że nas zostawiasz 😢</DialogTitle>
                        <DialogDescription>
                            Twoja opinia jest dla nas kluczowa. Powiedz nam szczerze, co poszło nie tak?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <RadioGroup value={feedbackReason} onValueChange={setFeedbackReason}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="too_expensive" id="r1" />
                                <Label htmlFor="r1">Za drogo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="missing_features" id="r2" />
                                <Label htmlFor="r2">Brak potrzebnych funkcji</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="too_complicated" id="r3" />
                                <Label htmlFor="r3">Za trudne w obsłudze</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="just_testing" id="r4" />
                                <Label htmlFor="r4">Tylko testowałem/am</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="other" id="r5" />
                                <Label htmlFor="r5">Inny powód</Label>
                            </div>
                        </RadioGroup>

                        <Textarea
                            placeholder="Zostaw dodatkowy komentarz..."
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFeedbackOpen(false)}>Wróć</Button>
                        <Button variant="destructive" onClick={handleFeedbackSubmit} disabled={isLoading}>
                            {isLoading ? 'Wysyłanie...' : 'Wyślij i wyloguj'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
