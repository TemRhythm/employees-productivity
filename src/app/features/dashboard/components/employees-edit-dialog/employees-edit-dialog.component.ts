import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmployeesTableItem } from '../employees-table/employees-table-datasource';
import { EmployeeService } from '../../services/employee.service';
import { Subject, takeUntil } from 'rxjs';
import { Shift } from '../../models/shift';
import { EmployeeWithShifts } from '../../models/employee';
import { deepCopy } from '../../../../../utils/cloneDeep';

@Component({
  selector: 'app-employees-edit-dialog',
  templateUrl: './employees-edit-dialog.component.html',
  styleUrls: ['./employees-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesEditDialogComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject();

  employees: EmployeeWithShifts[] = [];
  filteredShifts: { [key: string]: Shift[] } = {};
  selectedDates: { [key: string]: Date } = {};
  savingProgress = 0;
  isSaving = false;
  isSavingError = false;
  constructor(
    public dialogRef: MatDialogRef<EmployeesEditDialogComponent>,
    private employeeService: EmployeeService,
    @Inject(MAT_DIALOG_DATA) public employeesTableItems: EmployeesTableItem[],
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.employeeService
      .groupEmployeesShifts(this.employeesTableItems.map((employee) => employee.id))
      .pipe(takeUntil(this.destroyed$))
      .subscribe((employees) => {
        this.employees = deepCopy(employees);
        for (const employee of employees) {
          this.selectedDates[employee.id] = new Date();
        }
      });
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    this.isSavingError = false;
    this.isSaving = true;
    this.cdr.detectChanges();
    this.employeeService.saveData(
      this.employees,
      (percentage) => {
        this.savingProgress = percentage;
        if (percentage >= 100) {
          this.isSaving = false;
          this.dialogRef.close(true);
        }
      },
      () => {
        this.isSaving = false;
        this.isSavingError = true;
        this.cdr.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.destroyed$.next(null);
  }

  filterShifts(date: Date, employee: EmployeeWithShifts) {
    this.selectedDates[employee.id] = date;
    const nextDay = new Date(date.getTime()).setDate(date.getDate() + 1);

    this.filteredShifts[employee.id] = employee.shifts.filter(
      (shift) => shift.clockIn > date.getTime() && shift.clockIn < nextDay
    );
  }

  timeChanged(shift: Shift, type: 'clockIn' | 'clockOut', value: string) {
    const currDate = new Date(shift[type]);
    const [hours, minutes] = value.split(':');
    currDate.setHours(+hours);
    currDate.setMinutes(+minutes);
    shift[type] = currDate.getTime();
  }
}
