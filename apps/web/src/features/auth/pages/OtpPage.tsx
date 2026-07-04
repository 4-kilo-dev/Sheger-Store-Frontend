import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OtpPage() { 
    return <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="w-full max-w-md border border-border bg-surface p-8">
            <div className="label-eyebrow text-accent">Secure verification</div>
            <h1 className="mt-3 text-2xl font-bold">Enter your 6-digit code</h1>
            <p className="mt-2 text-xs leading-5 text-text-2">We sent a one-time code to <span className="font-mono text-foreground">+251 911 ••• 611</span>. It expires in 05:00.</p>
            <div className="mt-8 grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <input key={i} aria-label={`Digit ${i + 1}`} maxLength={1} className="h-12 min-w-0 border border-border bg-surface-2 text-center font-mono text-lg font-bold outline-none focus:border-accent"/>)}</div>
            <Button asChild className="mt-5 h-11 w-full"><Link to="/">Verify & open dashboard <ArrowRight/></Link></Button>
            <Button variant="ghost" className="mt-2 w-full text-text-2"><RotateCcw/> Resend code</Button>
            </section>
            </main>; 
    }
