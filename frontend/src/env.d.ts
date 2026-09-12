/// <reference path="../.astro/types.d.ts" />

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
