import type { Tables } from "./database.gen";

export type DineType = "dine" | "take" | "delivery";

export type Dish = Tables<"dishes">;

export type Restaurant = Tables<"restaurants"> & {
  dishes: Dish[];
};
