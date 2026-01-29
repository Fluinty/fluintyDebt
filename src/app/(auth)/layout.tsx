import type { Metadata } from 'next';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const metadata: Metadata = {
    title: 'FluintyDebt - Logowanie',
    description: 'Zaloguj się do platformy FluintyDebt',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex w-full">
            {/* Left side - Premium Branding (LIGHT THEME) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-50 text-slate-900 p-12 flex-col justify-between">

                {/* Aurora Background Effects (Light Mode adjusted) */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-200/40 via-white/0 to-white/0 animate-aurora-1 opacity-70 blur-3xl"></div>
                    <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-200/40 via-white/0 to-white/0 animate-aurora-2 opacity-60 blur-3xl"></div>
                    <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[100px] animate-aurora-3"></div>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                                F
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">FluintyDebt</h1>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
                            <Zap className="w-3 h-3 fill-emerald-700" />
                            Darmowy dostęp dla pierwszych 10 firm
                        </div>
                    </div>

                    {/* Main Value Prop */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
                                Monitoruj swoje Faktury <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">
                                    i odzyskuj długi.
                                </span>
                            </h2>
                            <p className="mt-6 text-lg text-slate-600 max-w-md leading-relaxed">
                                Twój księgowy wysyła do KSeF. My pobieramy z KSeF, żebyś Ty wiedział na czym stoisz. Finanse i Windykacja w jednym miejscu.
                            </p>
                        </div>

                        {/* Feature Highlights (Light Cards) */}
                        <div className="space-y-3">
                            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Krok 1: Podłącz KSeF (lub wpisz ręcznie)</h3>
                                    <p className="text-sm text-slate-500">Monitoruj faktury z KSeF i dodawaj te spoza systemu.</p>
                                </div>
                            </div>

                            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Krok 2: Automatyczna Windykacja</h3>
                                    <p className="text-sm text-slate-500">System sam pilnuje terminów i wysyła wezwania.</p>
                                </div>
                            </div>

                            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Rezultat: Spokój i Płynność</h3>
                                    <p className="text-sm text-slate-500">Wiesz ile masz pieniędzy, bez dzwonienia do księgowej.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Trust */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                        <div className="flex -space-x-2">
                            {/* Mock Avatars */}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" title="Adam"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300" title="Beata"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400" title="Cezary"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                +1k
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
                                Zaufali liderzy
                            </p>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <svg key={i} className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
                <div className="absolute top-4 right-4 flex gap-4 text-sm font-medium text-muted-foreground">
                    <span>Pomoc</span>
                    <span>Kontakt</span>
                </div>

                <div className="w-full max-w-sm space-y-8">
                    {children}

                    <div className="text-center text-xs text-muted-foreground mt-8">
                        By clicking continue, you agree to our{' '}
                        <a href="#" className="underline hover:text-primary">Terms of Service</a>{' '}
                        and{' '}
                        <a href="#" className="underline hover:text-primary">Privacy Policy</a>
                        .
                    </div>
                </div>
            </div>
        </div>
    );
}
