export type Kind = "expense" | "income";
/** Clasificación 50/30/20: necesidad, deseo, ahorro. */
export type Bucket = "need" | "want" | "saving";

export interface Household {
  id: string;
  name: string;
  currency: string;
  savings_target_pct: number;
  invite_code: string;
}

export interface Member {
  household_id: string;
  user_id: string;
  display_name: string;
  color: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  kind: Kind;
  bucket: Bucket | null;
  icon: string;
  color: string;
  keywords: string[];
  monthly_budget: number | null;
  sort: number;
  archived: boolean;
}

export interface Recurring {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  category_id: string | null;
  frequency: "monthly" | "yearly";
  due_day: number;
  due_month: number | null;
  active: boolean;
  created_by: string | null;
}

export interface Goal {
  id: string;
  household_id: string;
  name: string;
  kind: "emergency" | "goal";
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  archived: boolean;
}

export interface Tx {
  id: string;
  household_id: string;
  kind: Kind;
  amount: number;
  category_id: string | null;
  note: string;
  occurred_on: string; // YYYY-MM-DD
  recurring_id: string | null;
  goal_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type NewTx = Pick<Tx, "kind" | "amount" | "category_id" | "note" | "occurred_on"> &
  Partial<Pick<Tx, "recurring_id" | "goal_id">>;
