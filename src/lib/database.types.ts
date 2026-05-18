export type DineType = 'dine' | 'take' | 'delivery'

export interface Dish {
  id: number
  restaurant_id: number
  name: string
  price: string | null
  rating: number
  dtype: 'main' | 'dessert'
  note: string | null
}

export interface Restaurant {
  id: number
  created_at: string
  name: string
  city: string | null
  cuisine: string | null
  dine_type: DineType
  env_rating: number
  svc_rating: number
  dine_note: string | null
  is_fav: boolean
  dishes: Dish[]
}

export type RestaurantInsert = Omit<Restaurant, 'id' | 'created_at' | 'dishes'>
export type DishInsert = Omit<Dish, 'id'>

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Omit<Restaurant, 'dishes'>
        Insert: RestaurantInsert & { id?: never; created_at?: never }
        Update: Partial<RestaurantInsert>
        Relationships: []
      }
      dishes: {
        Row: Dish
        Insert: DishInsert & { id?: never }
        Update: Partial<DishInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
