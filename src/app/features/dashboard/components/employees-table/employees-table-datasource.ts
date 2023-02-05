import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map } from 'rxjs/operators';
import { Observable, merge, takeUntil, Subject, tap } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { msToHours } from '../../../../../utils/date';

export interface EmployeesTableItem {
  id: string;
  name: string;
  email: string;
  totalClocked: number;
  regularPaid: number;
  overtimePaid: number;
}

/**
 * Data source for the EmployeesTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class EmployeesTableDataSource extends DataSource<EmployeesTableItem> {
  data: EmployeesTableItem[] = [];
  paginator: MatPaginator | undefined;
  sort: MatSort | undefined;
  private disconnected$ = new Subject();

  constructor(private employeeService: EmployeeService) {
    super();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<EmployeesTableItem[]> {
    if (this.paginator && this.sort) {
      // Combine everything that affects the rendered data into one update
      // stream for the data-table to consume.
      return merge(this.getData(), this.paginator.page, this.sort.sortChange).pipe(
        map(() => {
          return this.getPagedData(this.getSortedData([...this.data]));
        })
      );
    } else {
      throw Error('Please set the paginator and sort on the data source before connecting.');
    }
  }

  private getData() {
    return this.employeeService.getEmployeesHoursInfo().pipe(
      map((employeesHoursInfo) =>
        employeesHoursInfo.map(
          (employeeHoursInfo) =>
            ({
              id: employeeHoursInfo.employee.id,
              name: employeeHoursInfo.employee.name,
              email: employeeHoursInfo.employee.email,
              totalClocked: msToHours(employeeHoursInfo.regularMs + employeeHoursInfo.overtimeMs),
              regularPaid: msToHours(employeeHoursInfo.regularMs) * employeeHoursInfo.employee.hourlyRate,
              overtimePaid: msToHours(employeeHoursInfo.overtimeMs) * employeeHoursInfo.employee.hourlyRateOvertime,
            } as EmployeesTableItem)
        )
      ),
      tap((data) => (this.data = data)),
      takeUntil(this.disconnected$)
    );
  }

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getPagedData(data: EmployeesTableItem[]): EmployeesTableItem[] {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.splice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: EmployeesTableItem[]): EmployeesTableItem[] {
    if (!this.sort || !this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort?.direction === 'asc';
      switch (this.sort?.active) {
        case 'name':
          return compare(a.name, b.name, isAsc);
        case 'email':
          return compare(a.email, b.email, isAsc);
        case 'totalClocked':
          return compare(a.totalClocked, b.totalClocked, isAsc);
        case 'regularPaid':
          return compare(a.regularPaid, b.regularPaid, isAsc);
        case 'overtimePaid':
          return compare(a.overtimePaid, b.overtimePaid, isAsc);
        default:
          return 0;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {
    this.disconnected$.next(true);
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
