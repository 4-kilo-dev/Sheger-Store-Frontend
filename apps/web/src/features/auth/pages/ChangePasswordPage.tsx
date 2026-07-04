import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { changePasswordApi } from "@/features/auth/services/auth.api";

function Brand() { 
    return <div className="flex items-center gap-3">
        <div className="h-9 w-9 rotate-45 border-2 border-accent">
            <div className="m-1 h-5 w-5 border border-foreground"/></div>
            <div>
                <div className="text-sm font-bold tracking-[.22em]">VORTEX</div>
                <div className="text-[9px] font-bold tracking-[.32em] text-accent">VISUAL</div>
            </div>
        </div>; 
}

const changePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
    const navigate = useNavigate();

    const form = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const { mutate: changePassword, isPending } = useMutation({
        mutationFn: changePasswordApi,
        onSuccess: () => {
            toast.success("Password changed successfully!");
            navigate({ to: "/" });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to change password");
        },
    });

    const onSubmit = (data: ChangePasswordFormValues) => {
        changePassword({ password: data.password });
    };

    return (
        <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_0.85fr]">
            <section className="relative hidden overflow-hidden border-r border-border bg-surface p-12 lg:flex lg:flex-col lg:justify-between">
                <Brand/>
                <div>
                    <div className="label-eyebrow text-accent">Secure your account</div>
                    <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[1.05] tracking-tight">Set a strong, private password.</h1>
                    <p className="mt-5 max-w-lg text-sm leading-6 text-text-2">Please change the temporary password provided by your administrator to something only you know.</p>
                </div>
                <div className="text-xs text-text-3">Internal access · Addis Ababa, Ethiopia</div>
            </section>
            
            <section className="flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    <div className="mb-10 lg:hidden"><Brand/></div>
                    <ShieldCheck className="h-7 w-7 text-accent"/>
                    <h2 className="mt-5 text-2xl font-bold">Change Password</h2>
                    <p className="mt-2 text-xs text-text-2">Create a secure password to finalize your account setup.</p>
                    
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">New Password</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
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
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                className="h-11 border-border bg-surface px-3 font-mono focus:border-accent" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="mt-6 h-11 w-full" disabled={isPending}>
                                {isPending ? "Saving..." : "Save & Continue"} <ArrowRight/>
                            </Button>
                        </form>
                    </Form>
                </div>
            </section>
        </main>
    );
}
