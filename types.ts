
export type Role = 'ADMIN' | 'STANDARD';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  full_name?: string;
  email: string;
  role: Role;
  status: UserStatus;
  last_seen?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string; // e.g., 'Electricity', 'Registration'
  subType?: string; // e.g., 'Inscription', 'Participation'
  amount: number;
  comment: string;
  studentCount?: number;
}

export enum ExpenseCategory {
  SALAIRE_FIXE = "Salaire fixe",
  COMMISSION_VENDEUR = "Commission vendeur",
  REMUNERATION_TOTALE = "Rémunération totale des vendeurs",
  ANNONCE_PUB = "Annonce publicitaire",
  CREDIT_TEL = "Crédit de téléphone",
  LOCATION_LOCAL = "Location de local",
  IMPRESSION = "Impression",
  PHOTOCOPIE = "Photocopie",
  TRANSPORT = "Transport",
  LOCATION_GENERATRICE = "Location de génératrice",
  CARBURANT_GENERATRICE = "Carburant génératrice",
  MATERIELS_OUTILS = "Matériels / outils de travail",
  UNIFORME_STAFF = "Uniforme du staff"
}

export enum IncomeType {
  FORMATION_CAMERA = "Formation Caméra",
  FORMATION_ELECTRICITE = "Formation Électricité",
  PLATFORM = "Platform"
}

export enum FeeType {
  INSCRIPTION = "Inscription",
  PARTICIPATION = "Participation",
  CUSTOM = "Custom"
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  created_at: string;
}

export interface ExpenseField {
  id: number;
  form_id: number;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

export interface ExpenseForm {
  id: number;
  name: string;
  description: string;
  workspace_id: number;
  created_at: string;
  fields: ExpenseField[];
}

export interface ExpenseEntry {
  id: number;
  form_id: number;
  workspace_id: number;
  creator_id: number;
  data: Record<string, any>;
  created_at: string;
}
