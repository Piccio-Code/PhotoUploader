import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function photoUrl(dbPath: string): string {
  const normalized = dbPath.replace(/\\/g, "/");
  const rel = normalized.replace(/^\.?\/?photos\//, "");
  return `${API_BASE}/static/${rel}`.replace(/([^:])\/\//g, "$1/");
}
