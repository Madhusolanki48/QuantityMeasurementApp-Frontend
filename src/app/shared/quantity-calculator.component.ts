import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { MeasurementService } from '../core/measurement.service';
import { ToastService } from '../core/toast.service';
import { MeasurementType, Operation } from '../models';
import {
  ApiService,
  BackendHistoryRequest,
  BackendQuantityRequest,
  BackendQuantityResponse,
} from '../../services/api.service';

@Component({
  selector: 'app-quantity-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quantity-calculator.component.html',
  styleUrls: ['./quantity-calculator.component.css'],
})
export class QuantityCalculatorComponent implements OnChanges {
  @Input({ required: true }) type!: MeasurementType;
  @Output() saved = new EventEmitter<void>();

  operations: Operation[] = ['Convert', 'Add', 'Subtract', 'Compare', 'Divide'];
  activeOp: Operation = 'Convert';
  value1 = '';
  value2 = '';
  unit1 = '';
  unit2 = '';
  result = '-';
  resultLabel = 'Result';
  showResult = false;
  errorMessage = '';
  flashResult = false;
  isLoading = false;

  constructor(
    private readonly measurementService: MeasurementService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly api: ApiService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['type']) {
      this.resetForm();
    }
  }

  get units(): string[] {
    return this.measurementService.getUnits(this.type);
  }

  setOperation(op: Operation): void {
    this.activeOp = op;
    this.value1 = '';
    this.value2 = '';
    this.errorMessage = '';
    this.showResult = false;
    this.result = '-';
    this.syncDefaultsForOperation();
  }

  swapUnits(): void {
    const nextUnit1 = this.unit1;
    this.unit1 = this.unit2;
    this.unit2 = nextUnit1;
    this.toastService.show('Units swapped.');
  }

  calculate(): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.result = '-';
    this.showResult = false;
    this.isLoading = true;

    const value1 = this.readNumber(this.value1);
    if (value1 === null) {
      this.fail('Please enter a valid first value.');
      this.isLoading = false;
      return;
    }

    let value2: number | null = null;
    if (this.activeOp !== 'Convert') {
      value2 = this.readNumber(this.value2);
      if (value2 === null) {
        this.fail('Please enter a valid second value.');
        this.isLoading = false;
        return;
      }

      if (this.activeOp === 'Divide' && value2 === 0) {
        this.fail('Cannot divide by zero.');
        this.isLoading = false;
        return;
      }
    }

    const runCalculation = (userId: number) => {
      const request = this.buildRequest(userId, value1, value2);

      if (this.activeOp === 'Divide') {
        this.api.divide(request).subscribe({
          next: (res: number) => {
            this.finishCalculation(() => this.showBackendResult(res, null), userId, value1, value2, res);
          },
          error: (err) => {
            this.fail(this.extractErrorMessage(err));
            this.isLoading = false;
          },
        });
        return;
      }

      const apiCall =
        this.activeOp === 'Convert'
          ? this.api.convert(request)
          : this.activeOp === 'Add'
            ? this.api.add(request)
            : this.activeOp === 'Subtract'
              ? this.api.subtract(request)
              : this.api.compare(request);
      apiCall.subscribe({
        next: (payload: BackendQuantityResponse) => {
          if (payload.error) {
            this.fail(payload.message || 'Backend error');
            this.isLoading = false;
            return;
          }

          if (this.activeOp === 'Compare') {
            this.finishCalculation(() => this.showBackendResult(payload.result === 1 ? 1 : 0, null), userId, value1, value2, payload.result);
            return;
          }

          const resultUnit = this.activeOp === 'Convert' ? this.unit2 : this.unit1;
          this.finishCalculation(() => this.showBackendResult(payload.result, resultUnit), userId, value1, value2, payload.result);
        },
        error: (err) => {
          this.fail(this.extractErrorMessage(err));
          this.isLoading = false;
        },
      });
    };

    this.authService.resolveBackendUserId().subscribe({
      next: (userId) => runCalculation(userId),
      error: () => {
        runCalculation(1);
      },
    });
  }

  private showBackendResult(result: number | null, unit: string | null): void {
    if (result === null || result === undefined || Number.isNaN(result)) {
      this.fail('Backend returned an invalid result.');
      return;
    }

    const displayValue = this.activeOp === 'Compare' ? (result === 1 ? 'Equal' : 'Not Equal') : this.formatNumber(result);
    this.result = unit ? `${displayValue} ${this.unitLabel(unit)}` : displayValue;
    this.showResult = true;
    this.flashResult = true;
    setTimeout(() => (this.flashResult = false), 600);
  }

  private finishCalculation(
    showResultFn: () => void,
    userId: number,
    firstValue: number,
    secondValue: number | null,
    backendResult: number | null = null,
  ): void {
    showResultFn();

    const historyPayload = this.buildHistoryRequest(firstValue, secondValue, backendResult);
    this.api.postUserHistory(userId, historyPayload).subscribe({
      next: () => {
        this.toastService.show('Saved to history.');
        this.saved.emit();
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Result saved, but history sync failed.');
        this.saved.emit();
        this.isLoading = false;
      },
    });
  }

  private buildRequest(userId: number, value1: number, value2: number | null): BackendQuantityRequest {
    const measurementType = this.toBackendMeasurementType(this.type);
    const first = {
      value: value1,
      unit: this.unit1,
      measurementType,
    };

    if (this.activeOp === 'Convert') {
      return {
        userId,
        first,
        second: {
          value: 1,
          unit: this.unit2,
          measurementType,
        },
      };
    }

    return {
      userId,
      first,
      second: {
        value: value2 ?? 0,
        unit: this.unit2,
        measurementType,
      },
    };
  }

  private buildHistoryRequest(firstValue: number, secondValue: number | null, backendResult: number | null): BackendHistoryRequest {
    const measurementType = this.toBackendMeasurementType(this.type);
    return {
      operation: this.activeOp.toUpperCase(),
      measurementType,
      firstValue,
      firstUnit: this.unit1,
      secondValue: this.activeOp === 'Convert' ? 1 : secondValue,
      secondUnit: this.activeOp === 'Divide' ? this.unit2 : this.unit2,
      result: backendResult,
      error: false,
      errorMessage: '',
      timestamp: new Date().toISOString(),
    };
  }

  private resetForm(): void {
    const units = this.units;
    this.activeOp = 'Convert';
    this.value1 = '';
    this.value2 = '';
    this.unit1 = units[0] ?? '';
    this.unit2 = units[1] ?? units[0] ?? '';
    this.result = '-';
    this.resultLabel = 'Result';
    this.showResult = false;
    this.errorMessage = '';
  }

  private syncDefaultsForOperation(): void {
    const units = this.units;
    if (!this.unit1) {
      this.unit1 = units[0] ?? '';
    }
    if (!this.unit2) {
      this.unit2 = units[1] ?? units[0] ?? '';
    }
  }

  private fail(message: string): void {
    this.errorMessage = message;
    this.result = '-';
    this.showResult = false;
    this.toastService.show(message);
  }

  private extractErrorMessage(error: any): string {
    const candidate = error?.error?.message || error?.message;
    return typeof candidate === 'string' && candidate.trim() ? candidate : 'Backend error';
  }

  private readNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(6))}`;
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
      KELVIN: 'Kelvin',
    };

    return labels[unit] ?? unit;
  }

  private toBackendMeasurementType(type: MeasurementType): string {
    switch (type) {
      case 'length':
        return 'LengthUnit';
      case 'volume':
        return 'VolumeUnit';
      case 'weight':
        return 'WeightUnit';
      case 'temperature':
        return 'TemperatureUnit';
      default:
        return 'LengthUnit';
    }
  }
}
