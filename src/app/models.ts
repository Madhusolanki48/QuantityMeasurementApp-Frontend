export type MeasurementType = 'length' | 'volume' | 'weight' | 'temperature';
export type Operation = 'Convert' | 'Add' | 'Subtract' | 'Compare' | 'Divide';
export type DashboardTab = 'dashboard' | MeasurementType | 'history';

export interface AppUser {
  displayName: string;
  email: string;
  password: string;
  backendId?: number;
}

export interface HistoryEntry {
  id: number;
  type: MeasurementType;
  icon: string;
  op: Operation;
  expr: string;
  result: string;
  time: string;
}

export interface MeasurementMeta {
  type: MeasurementType;
  title: string;
  icon: string;
  description: string;
  units: string[];
}

export interface CalculationInput {
  value1: number;
  value2?: number;
  unit1: string;
  unit2?: string;
  targetUnit?: string;
}

export interface CalculationResult {
  display: string;
  expr: string;
}
