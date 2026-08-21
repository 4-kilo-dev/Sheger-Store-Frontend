import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StaffMember } from "@/features/checkout/services/operations.api";
import { updateStaffApi } from "@/features/users/services/staff.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditStaffModalProps {
  person: StaffMember | null;
  open: boolean;
  onClose: () => void;
}

export function EditStaffModal({ person, open, onClose }: EditStaffModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [active, setActive] = useState(true);
  const [isFreelancer, setIsFreelancer] = useState(false);

  useEffect(() => {
    if (!person) return;
    setName(person.name);
    setPhone(person.phone);
    setEmail(person.email || "");
    setTeam(person.team === "—" ? "" : person.team);
    setActive(person.status !== "OFF DUTY");
    setIsFreelancer(Boolean(person.isFreelancer));
  }, [person]);

  const { mutate: saveStaff, isPending } = useMutation({
    mutationFn: () => {
      if (!person?.id) throw new Error("Staff record is unavailable");
      return updateStaffApi(person.id, { name, phone, email, team, active, isFreelancer });
    },
    onSuccess: () => {
      toast.success("Staff details updated");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || "Failed to update staff details"),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    saveStaff();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update account contact details and staff classification.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Phone
              <Input className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Email
              <Input className="mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Team
              <Input className="mt-1" value={team} onChange={(event) => setTeam(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Active account
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={isFreelancer} onChange={(event) => setIsFreelancer(event.target.checked)} />
              Freelancer
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
