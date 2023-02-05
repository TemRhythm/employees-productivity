import { Shift } from './shift';

export interface Employee {
  id: string;
  name: string;
  email: string;
  hourlyRate: number;
  hourlyRateOvertime: number;
}

export interface EmployeeWithShifts extends Employee {
  shifts: Shift[];
}

export interface EmployeeTimeInfo {
  employee: Employee;
  overtimeMs: number;
  regularMs: number;
}
