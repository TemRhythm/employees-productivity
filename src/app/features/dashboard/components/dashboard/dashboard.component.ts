import { Component, HostBinding } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';
import { map, shareReplay } from 'rxjs/operators';
import { filter, combineLatest } from 'rxjs';
import { Shift } from '../../models/shift';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  @HostBinding('class') hostClass = 'app-dashboard';
  employees$ = this.employeeService.getEmployees().pipe(shareReplay());
  shifts$ = this.employeeService.getShifts().pipe(shareReplay());
  dataIsLoading$ = combineLatest([this.employees$, this.shifts$]).pipe(
    map(([employees, shifts]) => employees === null || shifts === null)
  );
  paidForRegularHours$ = this.employeeService.getRegularHoursTotalPaid();
  paidForOvertimeHours$ = this.employeeService.getOvertimeHoursTotalPaid();
  totalTime$ = this.shifts$.pipe(
    filter((shifts) => !!shifts),
    map((shifts) => (shifts as Shift[]).reduce((acc, curr) => acc + curr.clockOut - curr.clockIn, 0))
  );

  constructor(private employeeService: EmployeeService) {}
}
