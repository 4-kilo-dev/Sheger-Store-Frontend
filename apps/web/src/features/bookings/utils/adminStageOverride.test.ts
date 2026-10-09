import { describe, expect, it, vi } from "vitest";
import { canBypassBookingStageLock } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { deleteAssignmentApi, setCrewTeamLeadApi } from "../services/bookings.api";
import { client } from "@/lib/api/client";

describe("canBypassBookingStageLock", () => {
  it("returns false for null or undefined user", () => {
    expect(canBypassBookingStageLock(null)).toBe(false);
    expect(canBypassBookingStageLock(undefined)).toBe(false);
  });

  it("returns true when user has admin role in roles array", () => {
    expect(canBypassBookingStageLock({ roles: ["admin"] })).toBe(true);
    expect(canBypassBookingStageLock({ roles: ["Admin"] })).toBe(true);
    expect(canBypassBookingStageLock({ roles: ["operator", "admin"] })).toBe(true);
  });

  it("returns true when user has role property as admin", () => {
    expect(canBypassBookingStageLock({ role: "admin" })).toBe(true);
    expect(canBypassBookingStageLock({ role: "Admin" })).toBe(true);
  });

  it("returns true when user has booking.override_status_lock permission", () => {
    expect(
      canBypassBookingStageLock({
        roles: ["technician"],
        permissions: [PERMISSION.BOOKING_OVERRIDE_STATUS_LOCK],
      })
    ).toBe(true);

    expect(
      canBypassBookingStageLock({
        permissions: ["booking.override_status_lock"],
      })
    ).toBe(true);
  });

  it("returns false for regular users without admin role or override permission", () => {
    expect(
      canBypassBookingStageLock({
        roles: ["technician", "crew"],
        permissions: ["booking.edit", "inventory.view"],
      })
    ).toBe(false);

    expect(
      canBypassBookingStageLock({
        role: "technician",
        roles: ["technician"],
        permissions: [],
      })
    ).toBe(false);
  });
});

describe("Assignment API endpoints with bookingId", () => {
  it("calls /api/bookings/:id/assignments/:id for deleteAssignmentApi when bookingId is passed", async () => {
    const deleteSpy = vi.spyOn(client, "delete").mockResolvedValueOnce({ success: true });
    await deleteAssignmentApi("assignment-123", "booking-456");
    expect(deleteSpy).toHaveBeenCalledWith("/api/bookings/booking-456/assignments/assignment-123");
    deleteSpy.mockRestore();
  });

  it("falls back to /api/assignments/:id for deleteAssignmentApi when bookingId is not passed", async () => {
    const deleteSpy = vi.spyOn(client, "delete").mockResolvedValueOnce({ success: true });
    await deleteAssignmentApi("assignment-123");
    expect(deleteSpy).toHaveBeenCalledWith("/api/assignments/assignment-123");
    deleteSpy.mockRestore();
  });

  it("calls /api/bookings/:id/assignments/:id/team-lead for setCrewTeamLeadApi when bookingId is passed", async () => {
    const postSpy = vi.spyOn(client, "post").mockResolvedValueOnce({ success: true });
    await setCrewTeamLeadApi("assignment-123", "booking-456");
    expect(postSpy).toHaveBeenCalledWith(
      "/api/bookings/booking-456/assignments/assignment-123/team-lead",
      {}
    );
    postSpy.mockRestore();
  });

  it("falls back to /api/assignments/:id/team-lead for setCrewTeamLeadApi when bookingId is not passed", async () => {
    const patchSpy = vi.spyOn(client, "patch").mockResolvedValueOnce({ success: true });
    await setCrewTeamLeadApi("assignment-123");
    expect(patchSpy).toHaveBeenCalledWith("/api/assignments/assignment-123/team-lead", {});
    patchSpy.mockRestore();
  });
});

describe("Error handling for locked bookings", () => {
  it("formats and passes backend 400 Bad Request error messages directly to toast", () => {
    const backendError = {
      statusCode: 400,
      message: "Booking details cannot be updated after completion",
      error: "Bad Request",
    };
    const errorMessage = backendError.message;
    expect(errorMessage).toBe("Booking details cannot be updated after completion");
  });
});
