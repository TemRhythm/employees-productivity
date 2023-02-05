import { TestBed } from '@angular/core/testing';
import { EmployeeService } from './employee.service';
import { Employee } from '../models/employee';
import { Shift } from '../models/shift';
import { of } from 'rxjs';
import { hoursToMs } from '../../../../utils/date';
import { HttpClientModule } from '@angular/common/http';

describe('EmployeeService', () => {
  let service: EmployeeService;
  const mockEmployee: Employee = {
    id: '1',
    name: 'Name',
    email: 'test@test.test',
    hourlyRateOvertime: 1,
    hourlyRate: 2,
  };
  const mockShift: Shift = {
    id: '1',
    employeeId: '1',
    clockIn: new Date('2/3/2023 23:00').getTime(),
    clockOut: new Date('2/4/2023 11:00').getTime(),
  };

  const regularHours = 9;
  const overtimeHours = 3;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmployeeService],
      imports: [HttpClientModule],
    });
    service = TestBed.inject(EmployeeService);
    service.getEmployees = () => {
      return of([mockEmployee]);
    };
    service.getShifts = () => {
      return of([mockShift]);
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get employees hours info', () => {
    service.getEmployeesHoursInfo().subscribe((result) => {
      expect(result.length).toBe(1);
      expect(result[0].employee.id).toBe(mockEmployee.id);
      expect(result[0].regularMs).toBe(hoursToMs(regularHours));
      expect(result[0].overtimeMs).toBe(hoursToMs(overtimeHours));
    });
  });

  it('should get total regular paid', () => {
    service.getRegularHoursTotalPaid().subscribe((result) => {
      expect(result).toBe(regularHours * mockEmployee.hourlyRate);
    });
  });

  it('should get total overtime paid', () => {
    service.getOvertimeHoursTotalPaid().subscribe((result) => {
      expect(result).toBe(overtimeHours * mockEmployee.hourlyRateOvertime);
    });
  });
});
