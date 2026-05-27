import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DineType } from "./database.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// shadcn-svelte utility types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

export const dineLabel: Record<DineType, string> = {
  dine: "Dine In",
  take: "Take Out",
  delivery: "Delivery",
};

export const CUISINES = [
  "日式",
  "中式",
  "意大利菜",
  "印度菜",
  "墨西哥菜",
  "地中海菜",
  "法式",
  "泰式",
  "美式",
  "其他",
];

export function ratingEmoji(n: number, dtype: "main" | "dessert"): string {
  if (!n) return "—";
  return (dtype === "dessert" ? "🍮" : "🥢").repeat(n);
}
