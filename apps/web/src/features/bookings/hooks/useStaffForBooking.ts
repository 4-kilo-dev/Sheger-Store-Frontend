import { useEffect, useState } from "react";
import { getStaffApi } from "@/features/users/services/staff.api";

/** Load staff list when the actor may assign tech/crew. */
export function useStaffForBooking(canFetchStaff: boolean) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isStaffRestricted, setIsStaffRestricted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canFetchStaff) {
      setStaffList([]);
      setIsStaffRestricted(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getStaffApi()
      .then((list) => {
        if (!cancelled) {
          setStaffList(list || []);
          setIsStaffRestricted(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStaffList([]);
          setIsStaffRestricted(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetchStaff]);

  return { staffList, isStaffRestricted, loading };
}
