import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { EmployeesTableDataSource, EmployeesTableItem } from './employees-table-datasource';
import { Employee } from '../../models/employee';
import { Shift } from '../../models/shift';
import { EmployeeService } from '../../services/employee.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { EmployeesEditDialogComponent } from '../employees-edit-dialog/employees-edit-dialog.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-employees-table',
  templateUrl: './employees-table.component.html',
  styleUrls: ['./employees-table.component.scss'],
})
export class EmployeesTableComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() employees: Employee[] = [];
  @Input() shifts: Shift[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<EmployeesTableItem>;
  dataSource!: EmployeesTableDataSource;
  selection!: SelectionModel<EmployeesTableItem>;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['select', 'name', 'email', 'totalClocked', 'regularPaid', 'overtimePaid'];
  private destroyed$ = new Subject();

  constructor(private employeeService: EmployeeService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.dataSource = new EmployeesTableDataSource(this.employeeService);
    this.selection = new SelectionModel<EmployeesTableItem>(true, []);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  openEditDialog() {
    this.dialog
      .open(EmployeesEditDialogComponent, {
        width: '750px',
        data: this.selection.selected,
      })
      .afterClosed()
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isSaved) => {
        if (isSaved) {
          this.selection.clear();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
}
