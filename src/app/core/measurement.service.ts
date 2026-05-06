import { Injectable } from '@angular/core';
import { CalculationInput, CalculationResult, HistoryEntry, MeasurementMeta, MeasurementType, Operation } from '../models';

type UnitGroup = {
  icon: string;
  description: string;
  units: string[];
  toBase: (value: number, unit: string) => number;
  fromBase: (value: number, unit: string) => number;
};

const LENGTH_FACTORS: Record<string, number> = {
  INCH: 1,
  FEET: 12,
  YARDS: 36,
  CENTIMETERS: 0.3937007874
};

const VOLUME_FACTORS: Record<string, number> = {
  MILLILITRE: 1,
  LITRE: 1000,
  GALLON: 3785.41
};

const WEIGHT_FACTORS: Record<string, number> = {
  GRAM: 1,
  KILOGRAM: 1000,
  POUND: 453.592
};

const UNIT_MAP: Record<MeasurementType, UnitGroup> = {
  length: {
    icon: 'bi-rulers',
    description: 'inch, feet, yards, centimeters',
    units: ['INCH', 'FEET', 'YARDS', 'CENTIMETERS'],
    toBase: (value, unit) => value * (LENGTH_FACTORS[unit] ?? 1),
    fromBase: (value, unit) => value / (LENGTH_FACTORS[unit] ?? 1)
  },
  volume: {
    icon: 'bi-droplet-fill',
    description: 'millilitre, litre, gallon',
    units: ['MILLILITRE', 'LITRE', 'GALLON'],
    toBase: (value, unit) => value * (VOLUME_FACTORS[unit] ?? 1),
    fromBase: (value, unit) => value / (VOLUME_FACTORS[unit] ?? 1)
  },
  weight: {
    icon: 'bi-box-seam-fill',
    description: 'gram, kilogram, pound',
    units: ['GRAM', 'KILOGRAM', 'POUND'],
    toBase: (value, unit) => value * (WEIGHT_FACTORS[unit] ?? 1),
    fromBase: (value, unit) => value / (WEIGHT_FACTORS[unit] ?? 1)
  },
  temperature: {
    icon: 'bi-thermometer-half',
    description: 'celsius, fahrenheit, kelvin',
    units: ['CELSIUS', 'FAHRENHEIT', 'KELVIN'],
    toBase: (value, unit) => {
      switch (unit) {
        case 'CELSIUS':
          return value;
        case 'FAHRENHEIT':
          return ((value - 32) * 5) / 9;
        case 'KELVIN':
          return value - 273.15;
        default:
          return value;
      }
    },
    fromBase: (value, unit) => {
      switch (unit) {
        case 'CELSIUS':
          return value;
        case 'FAHRENHEIT':
          return (value * 9) / 5 + 32;
        case 'KELVIN':
          return value + 273.15;
        default:
          return value;
      }
    }
  }
};

@Injectable({
  providedIn: 'root'
})
export class MeasurementService {
  getMeta(type: MeasurementType): MeasurementMeta {
    const meta = UNIT_MAP[type];
    return {
      type,
      title: this.titleFor(type),
      icon: meta.icon,
      description: meta.description,
      units: meta.units
    };
  }

  getUnits(type: MeasurementType): string[] {
    return UNIT_MAP[type].units;
  }

  metaList(): MeasurementMeta[] {
    return (Object.keys(UNIT_MAP) as MeasurementType[]).map((type) => this.getMeta(type));
  }

  iconFor(type: MeasurementType): string {
    return UNIT_MAP[type].icon;
  }

  calculate(type: MeasurementType, operation: Operation, input: CalculationInput): CalculationResult {
    // do the math in the browser for now
    switch (operation) {
      case 'Convert': {
        const converted = this.convert(type, input.value1, input.unit1, input.targetUnit ?? input.unit1);
        return {
          display: `${this.formatNumber(converted)} ${this.unitLabel(input.targetUnit ?? input.unit1)}`,
          expr: `${this.formatNumber(input.value1)} ${this.unitLabel(input.unit1)} = ${this.formatNumber(converted)} ${this.unitLabel(
            input.targetUnit ?? input.unit1
          )}`
        };
      }
      case 'Add': {
        const second = this.convert(type, input.value2 ?? 0, input.unit2 ?? input.unit1, input.unit1);
        const result = input.value1 + second;
        return {
          display: `${this.formatNumber(result)} ${this.unitLabel(input.unit1)}`,
          expr: `${this.formatNumber(input.value1)} ${this.unitLabel(input.unit1)} + ${this.formatNumber(input.value2 ?? 0)} ${this.unitLabel(
            input.unit2 ?? input.unit1
          )} = ${this.formatNumber(result)} ${this.unitLabel(input.unit1)}`
        };
      }
      case 'Subtract': {
        const second = this.convert(type, input.value2 ?? 0, input.unit2 ?? input.unit1, input.unit1);
        const result = input.value1 - second;
        return {
          display: `${this.formatNumber(result)} ${this.unitLabel(input.unit1)}`,
          expr: `${this.formatNumber(input.value1)} ${this.unitLabel(input.unit1)} - ${this.formatNumber(input.value2 ?? 0)} ${this.unitLabel(
            input.unit2 ?? input.unit1
          )} = ${this.formatNumber(result)} ${this.unitLabel(input.unit1)}`
        };
      }
      case 'Compare': {
        const second = this.convert(type, input.value2 ?? 0, input.unit2 ?? input.unit1, input.unit1);
        const result = input.value1 === second ? 1 : 0;
        return {
          display: result === 1 ? 'Equal' : 'Not Equal',
          expr: `${this.formatNumber(input.value1)} ${this.unitLabel(input.unit1)} ? ${this.formatNumber(input.value2 ?? 0)} ${this.unitLabel(
            input.unit2 ?? input.unit1
          )} = ${result === 1 ? 'Equal' : 'Not Equal'}`
        };
      }
      case 'Divide': {
        const result = input.value1 / (input.value2 ?? 1);
        return {
          display: `${this.formatNumber(result)} ${this.unitLabel(input.unit1)}`,
          expr: `${this.formatNumber(input.value1)} / ${this.formatNumber(input.value2 ?? 1)} = ${this.formatNumber(result)} ${this.unitLabel(
            input.unit1
          )}`
        };
      }
      default:
        throw new Error('unsupported operation');
    }
  }

  getHistory(email: string): HistoryEntry[] {
    return this.readHistory(email).slice().reverse();
  }

  addHistory(email: string, entry: HistoryEntry): void {
    // keep each user history separate
    const history = this.readHistory(email);
    history.unshift(entry);
    localStorage.setItem(this.historyKey(email), JSON.stringify(history));
  }

  deleteHistory(email: string, id: number): void {
    const history = this.readHistory(email).filter((item) => item.id !== id);
    localStorage.setItem(this.historyKey(email), JSON.stringify(history));
  }

  clearHistory(email: string): void {
    localStorage.removeItem(this.historyKey(email));
  }

  private convert(type: MeasurementType, value: number, fromUnit: string, toUnit: string): number {
    // these factors are for local conversion only
    const group = UNIT_MAP[type];
    const base = group.toBase(value, fromUnit);
    return group.fromBase(base, toUnit);
  }

  private unitLabel(unit: string): string {
    const labels: Record<string, string> = {
      INCH: 'Inch',
      FEET: 'Feet',
      YARDS: 'Yards',
      CENTIMETERS: 'Centimeters',
      MILLILITRE: 'Millilitre',
      LITRE: 'Litre',
      GALLON: 'Gallon',
      GRAM: 'Gram',
      KILOGRAM: 'Kilogram',
      POUND: 'Pound',
      CELSIUS: 'Celsius',
      FAHRENHEIT: 'Fahrenheit',
      KELVIN: 'Kelvin'
    };

    return labels[unit] ?? unit;
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(6))}`;
  }

  private historyKey(email: string): string {
    return `miq_history_${email.toLowerCase()}`;
  }

  private readHistory(email: string): HistoryEntry[] {
    // history stays in the browser until backend integration
    const raw = localStorage.getItem(this.historyKey(email));
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as HistoryEntry[];
    } catch {
      return [];
    }
  }

  private titleFor(type: MeasurementType): string {
    switch (type) {
      case 'length':
        return 'Length';
      case 'volume':
        return 'Volume';
      case 'weight':
        return 'Weight';
      case 'temperature':
        return 'Temperature';
      default:
        return 'Measurement';
    }
  }
}
