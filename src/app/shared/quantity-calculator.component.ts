import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { MeasurementService } from '../core/measurement.service';
import { ToastService } from '../core/toast.service';
import { CalculationInput, CalculationResult, HistoryEntry, MeasurementType, Operation } from '../models';

@Component({
  selector: 'app-quantity-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quantity-calculator.component.html',
  styleUrls: ['./quantity-calculator.component.css']
})
export class QuantityCalculatorComponent implements OnChanges {
  @Input({ required: true }) type!: MeasurementType;
  @Output() saved = new EventEmitter<void>();

  operations: Operation[] = ['Convert', 'Add', 'Subtract', 'Multiply', 'Divide'];
  activeOp: Operation = 'Convert';
  value1 = '';
  value2 = '';
  unit1 = '';
  unit2 = '';
  result = '—';
  resultLabel = 'Result';
  showResult = false;
  errorMessage = '';
  flashResult = false;

  constructor(
    private readonly measurementService: MeasurementService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['type']) {
      this.resetForm();
    }
  }

  get units(): string[] {
    return this.measurementService.getUnits(this.type);
  }

  get usesTargetUnit(): boolean {
    return this.activeOp === 'Add' || this.activeOp === 'Subtract';
  }

  get isScalarOperation(): boolean {
    return this.activeOp === 'Multiply' || this.activeOp === 'Divide';
  }

  setOperation(op: Operation): void {
    this.activeOp = op;
    this.errorMessage = '';
    this.showResult = false;
    this.result = '—';
    this.syncDefaultsForOperation();
  }

  swapUnits(): void {
    const nextUnit1 = this.unit1;
    this.unit1 = this.unit2;
    this.unit2 = nextUnit1;
    this.toastService.show('Units swapped.');
  }

  calculate(): void {
    this.errorMessage = '';

    const value1 = this.readNumber(this.value1);
    if (value1 === null) {
      this.fail('Please enter a valid first value.');
      return;
    }

    let value2: number | null = null;
    if (this.activeOp !== 'Convert') {
      value2 = this.readNumber(this.value2);
      if (value2 === null) {
        this.fail('Please enter a valid second value.');
        return;
      }

      if (this.activeOp === 'Divide' && value2 === 0) {
        this.fail('Cannot divide by zero.');
        return;
      }
    }

    const input: CalculationInput = {
      value1,
      value2: value2 ?? undefined,
      unit1: this.unit1,
      unit2: this.unit2,
      targetUnit: this.unit2
    };

    try {
      // send the values to the shared math service
      const output = this.measurementService.calculate(this.type, this.activeOp, input);
      this.applyResult(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calculation failed.';
      this.fail(message);
    }
  }

  private applyResult(output: CalculationResult): void {
    this.result = output.display;
    this.showResult = true;
    this.flashResult = true;
    setTimeout(() => (this.flashResult = false), 600);

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.show('Please sign in again.');
      return;
    }

    // store the result in browser history for now
    const entry: HistoryEntry = {
      id: Date.now(),
      type: this.type,
      icon: this.measurementService.iconFor(this.type),
      op: this.activeOp,
      expr: output.expr,
      result: output.display,
      time: new Date().toLocaleString()
    };

    this.measurementService.addHistory(user.email, entry);
    this.toastService.show('Saved to history.');
    this.saved.emit();
  }

  private resetForm(): void {
    // reset the form when measurement tab changes
    const units = this.units;
    this.activeOp = 'Convert';
    this.value1 = '';
    this.value2 = '';
    this.unit1 = units[0] ?? '';
    this.unit2 = units[1] ?? units[0] ?? '';
    this.result = '—';
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
    this.result = '—';
    this.showResult = false;
    this.toastService.show(message);
  }

  private readNumber(value: string): number | null {
    if (value.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
