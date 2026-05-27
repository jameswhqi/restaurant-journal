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

export function dineLabels(types: DineType[]): string {
  return types.map((t) => dineLabel[t] ?? t).join(" & ");
}

// Sort Latin names before Chinese names; Chinese names sorted by pinyin.
const _pinyinCollator = new Intl.Collator("zh-u-co-pinyin", {
  sensitivity: "base",
});
const _cjkRe = /^[\u4e00-\u9fff\u3400-\u4dbf]/;

export function compareNames(a: string, b: string): number {
  const aChinese = _cjkRe.test(a);
  const bChinese = _cjkRe.test(b);
  if (aChinese !== bChinese) return aChinese ? 1 : -1;
  return _pinyinCollator.compare(a, b);
}

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

export function ratingEmoji(
  n: number,
  dtype: "main" | "dessert" | "drink",
): string {
  if (n === -1) return "💣";
  if (!n) return "—";
  const emoji = dtype === "dessert" ? "🍮" : dtype === "drink" ? "🍻" : "🥢";
  return emoji.repeat(n);
}
