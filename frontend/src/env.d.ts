// Ambient types for the app. Astro's generated types are picked up via tsconfig
// "include", so no triple-slash reference is needed here.

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    } | null;
  }
}
