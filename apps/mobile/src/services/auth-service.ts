import { MOCK_ACCOUNTS } from "@/data/mock";
import type { Profile } from "@/types/domain";

const delay = async () => undefined;

export interface AuthSession {
  profile: Profile;
  mustChangePassword: boolean;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    await delay();
    const account = MOCK_ACCOUNTS.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account || account.password !== password) {
      throw new Error("Incorrect email or password");
    }
    return { profile: account.profile, mustChangePassword: Boolean(account.mustChangePassword) };
  },
  async changePassword(_password: string): Promise<{ success: true }> {
    await delay();
    return { success: true };
  },
};
