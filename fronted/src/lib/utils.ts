import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "./env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function photoUrl(dbPath: string): string {
  const normalized = dbPath.replace(/\\/g, "/");
  const rel = normalized
    .replace(/^\.?\/?photos\//, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map(encodeURIComponent)
    .join("/");

  return `${API_BASE_URL}/static/${rel}`;
}
