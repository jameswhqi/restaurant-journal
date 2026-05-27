import * as yaml from "js-yaml";
import type { Restaurant, Dish } from "./database.types";

// ── Types ─────────────────────────────────────────────────────────────────

interface ExportDish {
  name: string;
  dtype: "main" | "dessert" | "drink";
  rating: number;
  price?: string;
  note?: string;
}

interface ExportRestaurant {
  name: string;
  city?: string;
  cuisine?: string;
  dine_type: string | string[];
  env_rating: number;
  svc_rating: number;
  is_fav: boolean;
  dine_note?: string;
  dishes?: ExportDish[];
}

interface ExportFile {
  version: number;
  exported_at: string;
  restaurants: ExportRestaurant[];
}

// ── Export ────────────────────────────────────────────────────────────────

function toExportRestaurant(r: Restaurant): ExportRestaurant {
  const out: ExportRestaurant = {
    name: r.name,
    dine_type: r.dine_type,
    env_rating: r.env_rating,
    svc_rating: r.svc_rating,
    is_fav: r.is_fav,
  };
  if (r.city) out.city = r.city;
  if (r.cuisine) out.cuisine = r.cuisine;
  if (r.dine_note) out.dine_note = r.dine_note;
  if (r.dishes?.length) {
    out.dishes = r.dishes.map((d) => {
      const dish: ExportDish = {
        name: d.name,
        dtype: (d.dtype ?? "main") as "main" | "dessert" | "drink",
        rating: d.rating,
      };
      if (d.price) dish.price = d.price;
      if (d.note) dish.note = d.note;
      return dish;
    });
  }
  return out;
}

export function exportToYaml(restaurants: Restaurant[]): string {
  const data: ExportFile = {
    version: 1,
    exported_at: new Date().toISOString(),
    restaurants: restaurants.map(toExportRestaurant),
  };
  return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
}

export function downloadYaml(restaurants: Restaurant[]): void {
  const content = exportToYaml(restaurants);
  const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `restaurant-journal-${date}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────────────

export interface ImportResult {
  restaurants: ImportedRestaurant[];
  errors: string[];
}

export interface ImportedRestaurant {
  name: string;
  city: string | null;
  cuisine: string | null;
  dine_type: string[];
  env_rating: number;
  svc_rating: number;
  is_fav: boolean;
  dine_note: string | null;
  dishes: ImportedDish[];
}

export interface ImportedDish {
  name: string;
  dtype: string;
  rating: number;
  price: string | null;
  note: string | null;
}

const VALID_DINE_TYPES = new Set(["dine", "take", "delivery"]);
const VALID_DTYPES = new Set(["main", "dessert", "drink"]);

export function parseYaml(raw: string): ImportResult {
  const errors: string[] = [];
  const restaurants: ImportedRestaurant[] = [];

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    return { restaurants: [], errors: [`YAML parse error: ${String(e)}`] };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as ExportFile).restaurants)
  ) {
    return {
      restaurants: [],
      errors: ["Invalid format: expected a top-level `restaurants` list."],
    };
  }

  const file = parsed as ExportFile;
  const rawList = file.restaurants;

  rawList.forEach((item, i) => {
    const idx = `restaurants[${i}]`;
    if (!item || typeof item !== "object") {
      errors.push(`${idx}: not an object, skipped`);
      return;
    }
    if (!item.name || typeof item.name !== "string") {
      errors.push(`${idx}: missing required field 'name', skipped`);
      return;
    }

    const rawDineType = item.dine_type;
    const dineType: string[] = Array.isArray(rawDineType)
      ? (rawDineType as string[]).filter((v) => VALID_DINE_TYPES.has(v))
      : typeof rawDineType === "string" && VALID_DINE_TYPES.has(rawDineType)
        ? [rawDineType]
        : ["dine"];

    const envRating =
      typeof item.env_rating === "number" &&
      item.env_rating >= 0 &&
      item.env_rating <= 3
        ? item.env_rating
        : 0;

    const svcRating =
      typeof item.svc_rating === "number" &&
      item.svc_rating >= 0 &&
      item.svc_rating <= 3
        ? item.svc_rating
        : 0;

    const dishes: ImportedDish[] = [];
    if (Array.isArray(item.dishes)) {
      item.dishes.forEach((d: ExportDish, j: number) => {
        const didx = `${idx}.dishes[${j}]`;
        if (!d || typeof d !== "object") {
          errors.push(`${didx}: not an object, skipped`);
          return;
        }
        if (!d.name || typeof d.name !== "string") {
          errors.push(`${didx}: missing required field 'name', skipped`);
          return;
        }
        const dtype =
          typeof d.dtype === "string" && VALID_DTYPES.has(d.dtype)
            ? d.dtype
            : "main";
        const rating =
          typeof d.rating === "number" && d.rating >= -1 && d.rating <= 4
            ? d.rating
            : 0;
        dishes.push({
          name: d.name,
          dtype,
          rating,
          price: d.price ? String(d.price) : null,
          note: d.note ? String(d.note) : null,
        });
      });
    }

    restaurants.push({
      name: item.name,
      city: item.city ? String(item.city) : null,
      cuisine: item.cuisine ? String(item.cuisine) : null,
      dine_type: dineType,
      env_rating: envRating,
      svc_rating: svcRating,
      is_fav: item.is_fav === true,
      dine_note: item.dine_note ? String(item.dine_note) : null,
      dishes,
    });
  });

  return { restaurants, errors };
}
