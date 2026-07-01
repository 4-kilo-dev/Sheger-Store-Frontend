import { Link } from "@tanstack/react-router";
import { Plus, Package, ShieldAlert, BarChart3, Headphones, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";

export function QuickActionsWidget() {
  const authUser = useAuthUser();
  const role = authUser?.role?.toLowerCase() || "";

  // 1. Actions configuration based on role
  const actions = (() => {
    if (role === "admin" || role === "supervisor") {
      return [
        { label: "New booking", icon: Plus, to: "/bookings/new" as const, variant: "default" as const },
        { label: "Check out equipment", icon: Package, to: "/checkout" as const, variant: "outline" as const },
        { label: "Report damage", icon: ShieldAlert, to: "/damage-report" as const, variant: "outline" as const },
        { label: "View reports", icon: BarChart3, to: "/reports" as const, variant: "outline" as const },
      ];
    }
    if (role === "ccr") {
      return [
        { label: "New booking", icon: Plus, to: "/bookings/new" as const, variant: "default" as const },
        { label: "All bookings", icon: Headphones, to: "/bookings" as const, variant: "outline" as const },
        { label: "Report damage", icon: ShieldAlert, to: "/damage-report" as const, variant: "outline" as const },
      ];
    }
    if (role === "storekeeper") {
      return [
        { label: "Check out equipment", icon: Package, to: "/checkout" as const, variant: "default" as const },
        { label: "Report damage", icon: ShieldAlert, to: "/damage-report" as const, variant: "outline" as const },
        { label: "View all bookings", icon: FileText, to: "/bookings" as const, variant: "outline" as const },
      ];
    }
    // Default actions for tech, logistics, stagehands
    return [
      { label: "Report damage", icon: ShieldAlert, to: "/damage-report" as const, variant: "outline" as const },
      { label: "View all bookings", icon: FileText, to: "/bookings" as const, variant: "outline" as const },
    ];
  })();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {actions.map(({ label, icon: Icon, to, variant }) => (
        <Button
          key={label}
          variant={variant}
          size="default"
          asChild
          className="h-auto p-3.5 flex items-center justify-center gap-2 text-[12px] font-semibold"
        >
          <Link to={to}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
export default QuickActionsWidget;
