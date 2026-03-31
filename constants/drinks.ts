export interface DrinkType {
  id: string;
  label: string;
  icon: string;
  hydrationMultiplier: number;
  color: string;
}

export const DRINK_TYPES: DrinkType[] = [
  {
    id: 'water',
    label: 'Water',
    icon: 'water',
    hydrationMultiplier: 1.0,
    color: '#9CD5FF',
  },
  {
    id: 'juice',
    label: 'Juice',
    icon: 'local-bar',
    hydrationMultiplier: 0.85,
    color: '#FFB347',
  },
  {
    id: 'tea',
    label: 'Tea',
    icon: 'emoji-food-beverage',
    hydrationMultiplier: 0.9,
    color: '#C8A97D',
  },
  {
    id: 'coffee',
    label: 'Coffee',
    icon: 'coffee',
    hydrationMultiplier: 0.7,
    color: '#8B5E3C',
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: 'sports-bar',
    hydrationMultiplier: 0.95,
    color: '#7AAACE',
  },
];

export const QUICK_ADD_AMOUNTS = [150, 250, 350, 500];

export const getDrinkById = (id: string): DrinkType => {
  return DRINK_TYPES.find((d) => d.id === id) || DRINK_TYPES[0];
};
