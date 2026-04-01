import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export interface DrinkType {
  id: string;
  label: string;
  icon: MaterialIconName;
  hydrationMultiplier: number;
  color: string;
  quickAdd?: boolean;
}

export const DRINK_TYPES: DrinkType[] = [
  {
    id: "water",
    label: "Water",
    icon: "water",
    hydrationMultiplier: 1.0,
    color: "#9CD5FF",
    quickAdd: true,
  },
  {
    id: "sparkling",
    label: "Sparkling",
    icon: "bubble-chart",
    hydrationMultiplier: 1.0,
    color: "#B3E5FC",
    quickAdd: true,
  },
  {
    id: "tea",
    label: "Tea",
    icon: "emoji-food-beverage",
    hydrationMultiplier: 0.9,
    color: "#C8A97D",
    quickAdd: true,
  },
  {
    id: "green_tea",
    label: "Green Tea",
    icon: "local-cafe",
    hydrationMultiplier: 0.92,
    color: "#A5D6A7",
  },
  {
    id: "herbal_tea",
    label: "Herbal Tea",
    icon: "spa",
    hydrationMultiplier: 0.95,
    color: "#80CBC4",
  },
  {
    id: "coffee",
    label: "Coffee",
    icon: "coffee",
    hydrationMultiplier: 0.7,
    color: "#8B5E3C",
    quickAdd: true,
  },
  {
    id: "espresso",
    label: "Espresso",
    icon: "coffee-maker",
    hydrationMultiplier: 0.6,
    color: "#6D4C41",
    quickAdd: true,
  },
  {
    id: "juice",
    label: "Fruit Juice",
    icon: "local-bar",
    hydrationMultiplier: 0.85,
    color: "#FFB347",
    quickAdd: true,
  },
  {
    id: "smoothie",
    label: "Smoothie",
    icon: "blender",
    hydrationMultiplier: 0.75,
    color: "#F48FB1",
  },
  {
    id: "coconut_water",
    label: "Coconut Water",
    icon: "beach-access",
    hydrationMultiplier: 0.97,
    color: "#FFF9C4",
  },
  {
    id: "milk",
    label: "Milk",
    icon: "local-drink",
    hydrationMultiplier: 0.88,
    color: "#F5F5F5",
  },
  {
    id: "sports",
    label: "Sports Drink",
    icon: "directions-run",
    hydrationMultiplier: 0.95,
    color: "#6D92AC",
    quickAdd: true,
  },
  {
    id: "energy",
    label: "Energy Drink",
    icon: "flash-on",
    hydrationMultiplier: 0.5,
    color: "#CDDC39",
  },
  {
    id: "soda",
    label: "Soda",
    icon: "local-bar",
    hydrationMultiplier: 0.55,
    color: "#CE93D8",
  },
  {
    id: "lemonade",
    label: "Lemonade",
    icon: "wb-sunny",
    hydrationMultiplier: 0.82,
    color: "#FFF176",
  },
  {
    id: "broth",
    label: "Broth / Soup",
    icon: "soup-kitchen",
    hydrationMultiplier: 0.9,
    color: "#FFCC80",
  },
  {
    id: "beer",
    label: "Beer",
    icon: "sports-bar",
    hydrationMultiplier: 0.4,
    color: "#F9A825",
  },
  {
    id: "wine",
    label: "Wine",
    icon: "wine-bar",
    hydrationMultiplier: 0.25,
    color: "#AD1457",
  },
  {
    id: "spirits",
    label: "Spirits",
    icon: "local-bar",
    hydrationMultiplier: 0.1,
    color: "#7B1FA2",
  },
  {
    id: "cocktail",
    label: "Cocktail",
    icon: "nightlife",
    hydrationMultiplier: 0.2,
    color: "#E91E63",
  },
];

export const QUICK_ADD_DRINKS = DRINK_TYPES.filter((d) => d.quickAdd);

export const QUICK_ADD_AMOUNTS = [100, 150, 250, 350, 500, 750, 1000];

export const getDrinkById = (id: string): DrinkType => {
  return DRINK_TYPES.find((d) => d.id === id) || DRINK_TYPES[0];
};
