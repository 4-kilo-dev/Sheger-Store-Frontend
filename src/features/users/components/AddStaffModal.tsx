import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createStaffApi, getRolesApi } from "@/features/users/services/staff.api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { STAFF_ROLES } from "@/features/checkout/services/operations.api";

const addStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[0-9\s\-]+$/, "Phone number can only contain digits, spaces, and hyphens").min(10, "Phone must be at least 10 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select a role"),
  team: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AddStaffFormValues = z.infer<typeof addStaffSchema>;

export function AddStaffModal() {
  const [open, setOpen] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRolesApi,
  });

  const fallbackRoles = [
    { id: "ccr", key: "ccr", displayName: "CCR" },
    { id: "cto", key: "cto", displayName: "Chief Technician" },
    { id: "to", key: "to", displayName: "Technician" },
    { id: "oo", key: "oo", displayName: "Operation Officer" },
    { id: "sk", key: "sk", displayName: "Storekeeper" },
  ];
  const displayRoles = roles.length > 0 ? roles : fallbackRoles;

  const form = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: "",
      phone: "+251 ",
      email: "",
      role: "",
      team: "",
      password: "",
    },
  });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", newPassword, { shouldValidate: true });
    setIsGenerated(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(form.getValues("password"));
  };

  const queryClient = useQueryClient();
  const { mutate: createStaff, isPending } = useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => {
      toast.success("Staff member added successfully!");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setOpen(false);
      form.reset();
      setIsGenerated(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add staff member");
    },
  });

  const onSubmit = (data: AddStaffFormValues) => {
    createStaff(data);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) form.reset();
    }}>
      <DialogTrigger asChild>
        <button
          className="flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          Add Staff Member
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account. You can manually enter a password or auto-generate one.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+251 900 000 000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@vortexvisual.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {displayRoles.map((role) => (
                          <SelectItem key={role.id} value={role.displayName}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Alpha Crew" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 border-t pt-4 mt-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter or generate password"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setIsGenerated(false);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={generatePassword} title="Generate Password">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} title="Copy to Clipboard">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {isGenerated && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Password generated. Please copy and securely share it with the staff member.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
