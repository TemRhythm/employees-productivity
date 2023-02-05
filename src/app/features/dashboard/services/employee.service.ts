import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Employee, EmployeeTimeInfo, EmployeeWithShifts } from '../models/employee';
import { BehaviorSubject, filter, Observable, combineLatest, switchMap, take, tap, EMPTY, forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Shift } from '../models/shift';
import { hoursToMs, millisecondsUntilMidnight, msToHours } from '../../../../utils/date';
import { map } from 'rxjs/operators';
import { getPercentage } from '../../../../utils/progress';

interface DataToUpdate {
  employees: Employee[];
  shifts: Shift[];
}

@Injectable()
export class EmployeeService {
  private readonly MAX_NON_OVERTIME_HOUR_PER_DAY = 8;
  private readonly MAX_NON_OVERTIME_MS_PER_DAY = hoursToMs(this.MAX_NON_OVERTIME_HOUR_PER_DAY);

  private employees$ = new BehaviorSubject<Employee[] | null>(null);
  private shifts$ = new BehaviorSubject<Shift[] | null>(null);

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[] | null> {
    if (!this.employees$.value) {
      this.http
        .get<Employee[]>(`${environment.apiBase}/employees`)
        .subscribe((employees) => this.employees$.next(employees));
    }
    return this.employees$;
  }

  getShifts(): Observable<Shift[] | null> {
    if (!this.shifts$.value) {
      this.http.get<Shift[]>(`${environment.apiBase}/shifts`).subscribe((shifts) => this.shifts$.next(shifts));
    }
    return this.shifts$;
  }

  getRegularHoursTotalPaid(): Observable<number> {
    return this.getEmployeesHoursInfo().pipe(
      map((employeesTimeInfo) =>
        employeesTimeInfo.reduce((acc, curr) => acc + msToHours(curr.regularMs) * curr.employee.hourlyRate, 0)
      )
    );
  }
  getOvertimeHoursTotalPaid(): Observable<number> {
    return this.getEmployeesHoursInfo().pipe(
      map((employeesTimeInfo) =>
        employeesTimeInfo.reduce((acc, curr) => acc + msToHours(curr.overtimeMs) * curr.employee.hourlyRateOvertime, 0)
      )
    );
  }

  getEmployeesHoursInfo(): Observable<EmployeeTimeInfo[]> {
    return this.groupEmployeesShifts().pipe(
      map((employeeWithShifts) =>
        employeeWithShifts.map((employeeWithShifts) => {
          let msFromMidnight = 0;
          const msByDays: number[] = [0];
          for (const shift of employeeWithShifts.shifts) {
            const clockInDate = new Date(shift.clockIn);
            const clockOutDate = new Date(shift.clockOut);
            if (clockInDate.getDate() === clockOutDate.getDate()) {
              msByDays[msByDays.length - 1] += shift.clockOut - shift.clockIn;
              if (msFromMidnight !== 0) {
                msByDays[msByDays.length - 1] += msFromMidnight;
                msFromMidnight = 0;
              }
            } else {
              msByDays.push(0);
              const msUntilMidnight = millisecondsUntilMidnight(shift.clockIn);
              msByDays[msByDays.length - 1] += msUntilMidnight;
              msFromMidnight = shift.clockOut - msUntilMidnight;
            }
          }

          const result = {
            employee: employeeWithShifts,
            overtimeMs: 0,
            regularMs: 0,
          };

          for (const msOfDay of msByDays) {
            if (msOfDay < this.MAX_NON_OVERTIME_MS_PER_DAY) {
              result.regularMs += msOfDay;
            } else {
              result.regularMs += this.MAX_NON_OVERTIME_MS_PER_DAY;
              result.overtimeMs += msOfDay - this.MAX_NON_OVERTIME_MS_PER_DAY;
            }
          }
          return result;
        })
      )
    );
  }

  groupEmployeesShifts(ids?: string[]): Observable<EmployeeWithShifts[]> {
    return combineLatest([this.employees$, this.shifts$]).pipe(
      filter(([employees, shifts]) => !!employees && !!shifts),
      map(([employees, shifts]) => {
        const result = (employees as Employee[]).map(
          (employee) =>
            ({
              ...employee,
              shifts: (shifts as Shift[])
                .filter((shift) => shift.employeeId === employee.id)
                .sort((a, b) => a.clockIn - b.clockIn),
            } as EmployeeWithShifts)
        );
        if (ids && ids.length !== 0) {
          return result.filter((employee) => ids.includes(employee.id));
        }
        return result;
      })
    );
  }

  saveData(employees: EmployeeWithShifts[], progress: (percentage: number) => void, error: (error: string) => void) {
    const employeesIds = employees.map((employee) => employee.id);
    const currEmployees = this.employees$.value as Employee[];
    const currShifts = this.shifts$.value as Shift[];

    this.groupEmployeesShifts(employeesIds)
      .pipe(
        take(1),
        switchMap((oldData) => {
          const dataToUpdate = this.getEntitiesToUpdate(oldData, employees);
          if (dataToUpdate.employees.length === 0 && dataToUpdate.shifts.length === 0) {
            progress(100);
            return EMPTY;
          }
          const progressTotal = dataToUpdate.employees.length + dataToUpdate.shifts.length;
          let progressCounter = 0;
          return forkJoin([
            ...dataToUpdate.employees.map((employee) =>
              this.updateEmployee(employee).pipe(
                tap((savedEmployee) => {
                  progress(getPercentage(++progressCounter, progressTotal));
                  const updateAt = currEmployees.findIndex((currEmployee) => savedEmployee.id === currEmployee.id);
                  currEmployees[updateAt] = savedEmployee;
                })
              )
            ),
            ...dataToUpdate.shifts.map((shift) =>
              this.updateShift(shift).pipe(
                tap((savedShift) => {
                  progress(getPercentage(++progressCounter, progressTotal));
                  const updateAt = currShifts.findIndex((currShift) => savedShift.id === currShift.id);
                  currShifts[updateAt] = savedShift;
                })
              )
            ),
          ]);
        })
      )
      .subscribe({
        next: () => {
          this.employees$.next(currEmployees);
          this.shifts$.next(currShifts);
        },
        error: (err) => error(err),
      });
  }

  private getEntitiesToUpdate(oldData: EmployeeWithShifts[], employees: EmployeeWithShifts[]): DataToUpdate {
    const result: DataToUpdate = {
      employees: [],
      shifts: [],
    };
    for (const oldDataItem of oldData) {
      const newDataItem = employees.find((employee) => employee.id === oldDataItem.id);
      if (newDataItem) {
        if (
          newDataItem.name !== oldDataItem.name ||
          newDataItem.hourlyRate !== oldDataItem.hourlyRate ||
          newDataItem.hourlyRateOvertime != oldDataItem.hourlyRateOvertime
        ) {
          result.employees.push(newDataItem);
        }
        oldDataItem.shifts.forEach((oldShift) => {
          const newShift = newDataItem.shifts.find((shift) => shift.id === oldShift.id);
          if (newShift && (newShift.clockIn !== oldShift.clockIn || newShift.clockOut !== oldShift.clockOut)) {
            result.shifts.push(newShift);
          }
        });
      }
    }
    return result;
  }

  updateEmployee(employee: Employee): Observable<Employee> {
    return this.http.patch<Employee>(`${environment.apiBase}/employees/${employee.id}`, employee);
  }

  updateShift(shift: Shift): Observable<Shift> {
    return this.http.patch<Shift>(`${environment.apiBase}/shifts/${shift.id}`, shift);
  }
}
