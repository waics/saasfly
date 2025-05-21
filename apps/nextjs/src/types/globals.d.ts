export {}

declare global {
  interface CustomJwtSessionClaims {
    user?: {
      id: string;
      name: string;
      email: string;
      image: string;
      isAdmin?: boolean;
    }
  }
}
