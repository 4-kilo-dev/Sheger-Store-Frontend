import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginApi } from "@/features/auth/services/auth.api";

function Brand() { 
    return <div className="flex items-center gap-3">
        <div className="h-9 w-9 rotate-45 border-2 border-accent">
            <div className="m-1 h-5 w-5 border border-foreground"/></div>
            <div>
                <div className="text-sm font-bold tracking-[.22em]">VORTEX</div>
                <div className="text-[9px] font-bold tracking-[.32em] text-accent">VISUAL</div>
            </div>
        </div>; }

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() { 
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const { mutate: login, isPending } = useMutation({
        mutationFn: loginApi,
        onSuccess: (data) => {
            toast.success("Successfully signed in!");
            const mustChangePassword = !!(
                data.mustChangePassword ??
                data.user?.mustChangePassword ??
                data.user?.isFirstLogin
            );
            navigate({ to: mustChangePassword ? "/change-password" : "/" });
        },
        onError: (error: any) => {
            const errorMessage = "Incorrect password or email";
            form.setError("email", { type: "manual", message: errorMessage });
            form.setError("password", { type: "manual", message: errorMessage });
            toast.error(errorMessage);
        },
    });

    const onSubmit = (data: LoginFormValues) => {
        login(data);
    };

    return <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_0.85fr]">
            <section className="relative hidden overflow-hidden border-r border-border bg-surface p-12 lg:flex lg:flex-col lg:justify-between"><Brand/><div>
                <div className="label-eyebrow text-accent">Operations platform</div>
                    <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[1.05] tracking-tight">Every screen. Every crew. One clear operation.</h1>
                    <p className="mt-5 max-w-lg text-sm leading-6 text-text-2">Coordinate bookings, warehouse movement, installations, and client delivery from a single control room.</p>
                </div>
                <div className="text-xs text-text-3">Internal access · Addis Ababa, Ethiopia</div>
            </section>
        <section className="flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="mb-10 lg:hidden"><Brand/></div>
            <LockKeyhole className="h-7 w-7 text-accent"/>
            <h2 className="mt-5 text-2xl font-bold">Sign in to operations</h2>
            <p className="mt-2 text-xs text-text-2">Enter your credentials to sign in.</p>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Email address</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="email"
                                        placeholder="your-email@example.com"
                                        className="h-11 border-border bg-surface px-3 font-mono focus:border-accent" 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            type={showPassword ? "text" : "password"} 
                                            className="h-11 border-border bg-surface pl-3 pr-10 font-mono focus:border-accent" 
                                            {...field} 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none cursor-pointer ${
                                                showPassword ? "text-accent" : "text-text-3 hover:text-foreground"
                                            }`}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="mt-6 h-11 w-full" disabled={isPending}>
                        {isPending ? "Signing In..." : "Sign In"} <ArrowRight/>
                    </Button>
                </form>
            </Form>
            
            <p className="mt-5 text-center text-[10px] leading-4 text-text-3">Access is restricted to authorized Vortex Visual staff.</p>
            </div>
        </section>
    </main>; 
    }
