import { getCurrentUser as getNextAuthUser, authOptions } from "./nextauth";

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
}

declare global {
  interface CustomJwtSessionClaims {
    user?: User & {
      id: string;
      isAdmin: boolean;
    }
  }
}

export { authOptions };

export async function getCurrentUser() {
  return await getNextAuthUser();
}
