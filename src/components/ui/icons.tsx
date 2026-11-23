import {
  Baby, BookOpen, Briefcase, Bus, Car, Coffee, Coins, CreditCard, Dumbbell, Ellipsis, Fuel, Gift, GraduationCap,
  HeartPulse, House, Landmark, Music, PawPrint, Pill, Plane, Repeat, Shirt, ShoppingCart, Smartphone,
  Sofa, Sparkles, Tag, Ticket, UtensilsCrossed, Wrench, Zap, PiggyBank, type LucideIcon,
} from "lucide-react";


/** Íconos disponibles para categorías (la clave se guarda en la base). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cart: ShoppingCart, utensils: UtensilsCrossed, car: Car, home: House, zap: Zap, repeat: Repeat, heart: HeartPulse,
  sofa: Sofa, graduation: GraduationCap, card: CreditCard, ticket: Ticket, plane: Plane, shirt: Shirt, paw: PawPrint,
  gift: Gift, dots: Ellipsis, piggy: PiggyBank, briefcase: Briefcase, sparkles: Sparkles, coins: Coins, baby: Baby,
  dumbbell: Dumbbell, wrench: Wrench, book: BookOpen, phone: Smartphone, music: Music, coffee: Coffee, fuel: Fuel,
  bus: Bus, pill: Pill, landmark: Landmark, tag: Tag,
};

export const CATEGORY_COLORS = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red", "slate"] as const;
