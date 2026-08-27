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

// Country data: flag and cities
const COUNTRIES: Record<string, { flag: string; cities: string[] }> = {
  BE: {
    flag: "🇧🇪",
    cities: [
      "Antwerp",
      "Brussels",
      "Ghent",
      "Ixelles",
      "Lanaken",
      "Leuven",
      "Liege",
      "Turnhout",
    ],
  },
  DE: {
    flag: "🇩🇪",
    cities: ["Aachen", "Düsseldorf"],
  },
  ES: {
    flag: "🇪🇸",
    cities: ["Barcelona"],
  },
  FR: {
    flag: "🇫🇷",
    cities: ["Avignon", "Les Angles", "Lyon", "Orange", "Paris", "Versailles"],
  },
  IS: {
    flag: "🇮🇸",
    cities: [
      "Akureyri",
      "Höfn",
      "Njarðvík",
      "Ólafsvík",
      "Öræfi",
      "Reykjavík",
      "Reykolt",
      "Seyðisfjörður",
      "Skútustaðahreppur",
      "Snaefellsbaer",
    ],
  },
  LU: {
    flag: "🇱🇺",
    cities: ["Luxembourg"],
  },
  NL: {
    flag: "🇳🇱",
    cities: [
      "Amsterdam",
      "Arnhem",
      "Berlicum",
      "Breda",
      "Den Haag",
      "Delft",
      "Eindhoven",
      "Groningen",
      "Helmond",
      "Heusden",
      "Leeuwarden",
      "Leiden",
      "Maastricht",
      "Nijmegen",
      "Roermond",
      "Rotterdam",
      "'s-Hertogenbosch",
      "Thorn",
      "Tilburg",
      "Utrecht",
      "Valkenburg",
    ],
  },
  NO: {
    flag: "🇳🇴",
    cities: ["Narvik", "Oslo"],
  },
  SE: {
    flag: "🇸🇪",
    cities: ["Abisko"],
  },
};

// Build reverse mapping: city -> country code
const CITY_TO_COUNTRY_CODE: Record<string, string> = {};
for (const [code, { cities }] of Object.entries(COUNTRIES)) {
  for (const city of cities) {
    CITY_TO_COUNTRY_CODE[city] = code;
  }
}

export function getCityFlag(city: string | null | undefined): string {
  if (!city) return "";
  const countryCode = CITY_TO_COUNTRY_CODE[city];
  return countryCode ? (COUNTRIES[countryCode]?.flag ?? "") : "";
}

export function getCityCountryCode(city: string | null | undefined): string {
  if (!city) return "ZZ"; // Sort unknown cities last
  return CITY_TO_COUNTRY_CODE[city] ?? "ZZ";
}

export function getCountryFlag(countryCode: string): string {
  return COUNTRIES[countryCode]?.flag ?? "";
}

export function compareCities(a: string, b: string): number {
  const countryA = getCityCountryCode(a);
  const countryB = getCityCountryCode(b);
  if (countryA !== countryB) {
    return countryA.localeCompare(countryB);
  }
  return compareNames(a, b);
}

// Sort Latin names before Chinese names; Chinese names sorted by pinyin.
const _pinyinCollator = new Intl.Collator("zh-u-co-pinyin", {
  sensitivity: "base",
});
const _cjkRe = /^[\u4e00-\u9fff\u3400-\u4dbf]/;

export function compareNames(a: string, b: string): number {
  // Remove apostrophes for comparison
  const aNorm = a.replace(/'/g, "");
  const bNorm = b.replace(/'/g, "");
  const aChinese = _cjkRe.test(aNorm);
  const bChinese = _cjkRe.test(bNorm);
  if (aChinese !== bChinese) return aChinese ? 1 : -1;
  return _pinyinCollator.compare(aNorm, bNorm);
}

const _dtypeOrder: Record<string, number> = { main: 0, dessert: 1, drink: 2 };

export type Currency =
  | "EUR"
  | "GBP"
  | "ISK"
  | "JPY"
  | "NOK"
  | "SEK"
  | "USD";

export const CURRENCIES: Currency[] = [
  "EUR",
  "GBP",
  "ISK",
  "JPY",
  "NOK",
  "SEK",
  "USD",
];

/** Approximate rates: 1 EUR → X units of currency (hard-coded, May 2026) */
export const TO_EUR: Record<Currency, number> = {
  EUR: 1,
  GBP: 0.87,
  ISK: 143.2,
  JPY: 185.54,
  NOK: 10.78,
  SEK: 10.78,
  USD: 1.17,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  EUR: "€",
  GBP: "£",
  ISK: "kr",
  JPY: "¥",
  NOK: "kr",
  SEK: "kr",
  USD: "$",
};

/** Convert a price string in the given currency to a formatted EUR string, e.g. "€12.34" */
export function toEur(
  price: string | null | undefined,
  currency: Currency,
): string {
  if (!price) return "";
  const val = parseFloat(price);
  if (isNaN(val)) return "";
  const eur = val / TO_EUR[currency];
  return `€${eur.toFixed(2)}`;
}

/** Format a price for display on the card: always shown in EUR, rounded to cents */
export function displayPrice(
  price: string | null | undefined,
  currency: Currency,
): string {
  return toEur(price, currency);
}

export function compareDishes(
  a: { name: string; dtype: string; rating: number },
  b: { name: string; dtype: string; rating: number },
): number {
  const dtypeDiff = (_dtypeOrder[a.dtype] ?? 9) - (_dtypeOrder[b.dtype] ?? 9);
  if (dtypeDiff !== 0) return dtypeDiff;
  const ratingDiff = b.rating - a.rating;
  if (ratingDiff !== 0) return ratingDiff;
  return compareNames(a.name, b.name);
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
