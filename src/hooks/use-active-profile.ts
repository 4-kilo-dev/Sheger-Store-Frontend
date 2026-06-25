import { useState, useEffect } from "react";

export interface Profile {
  name: string;
  role: "Admin" | "CCR" | "CTO" | "TO" | "OO" | "SK";
  initials: string;
  color: string;
}

export const PROFILES: Profile[] = [
  { name: "Nathan B.", role: "Admin", initials: "NB", color: "var(--accent)" },
  { name: "Hanna T.", role: "CCR", initials: "HT", color: "var(--accent)" },
  { name: "Samuel K.", role: "CTO", initials: "SK", color: "var(--accent)" },
  { name: "Bereket G.", role: "TO", initials: "BG", color: "var(--color-status-accepted)" },
  { name: "Eyob W.", role: "OO", initials: "EW", color: "var(--accent)" },
  { name: "Selam A.", role: "SK", initials: "SA", color: "var(--color-bom-returned)" },
];

export function useActiveProfile() {
  // Initialize with default to ensure SSR and initial client render match perfectly
  const [profile, setProfileState] = useState<Profile>(PROFILES[0]);

  useEffect(() => {
    // Read from localStorage only after the component mounts
    const saved = localStorage.getItem("vortex_active_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) setProfileState(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
    localStorage.setItem("vortex_active_profile", JSON.stringify(newProfile));
    window.dispatchEvent(new Event("vortex_profile_changed"));
  };

  useEffect(() => {
    const handleChanged = () => {
      const saved = localStorage.getItem("vortex_active_profile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.role) setProfileState(parsed);
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener("vortex_profile_changed", handleChanged);
    return () => {
      window.removeEventListener("vortex_profile_changed", handleChanged);
    };
  }, []);

  return [profile, setProfile] as const;
}
