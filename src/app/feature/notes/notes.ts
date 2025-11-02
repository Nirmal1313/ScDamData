import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Message } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { Table } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Tag } from 'primeng/tag';
import { FloatLabel } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import moment from 'moment';
import {
  ProjectNote,
  UpsertProjectNoteCommand,
  DEFAULT_PROJECT_NOTE
} from './models/project-note.interface';
import { TableColumn, ColumnDataType } from './models/table-column.interface';
import {
  ProjectStatus,
  TaskPriority,
  NoteStatus,
  NoteType,
  ProjectStatusLabels,
  TaskPriorityLabels,
  NoteStatusLabels,
  NoteTypeLabels
} from './models/enums';
import { ProjectNoteService } from './services/project-note.service';
import { ColumnConfigService } from './services/column-config.service';
import { DateFormatPipe } from './pipes/date-format.pipe';
import { EnumToLabelPipe } from './pipes/enum-to-label.pipe';
import { UI_MESSAGES, VALIDATION_RULES } from './constants/project-note.constants';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PanelModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    Textarea,
    DatePicker,
    Select,
    ConfirmDialogModule,
    ToastModule,
    Message,
    DateFormatPipe,
    EnumToLabelPipe,
    IconFieldModule,
    InputIconModule,
    Toolbar,
    Tag,
    FloatLabel,
    InputGroupModule,
    InputGroupAddonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './notes.html',
  styleUrl: './notes.scss'
})
export class Notes implements OnInit, OnDestroy, AfterViewInit {
  projectNotes: ProjectNote[] = [];
  selectedNotes: ProjectNote[] = [];
  columns: TableColumn[] = [];
  globalFilterFields: string[] = [];
  loading: boolean = false;
  showFormDialog: boolean = false;
  noteForm!: FormGroup;
  isEditMode: boolean = false;
  searchValue: string = '';
  currentNote: ProjectNote | null = null;
  dateValidationError: string = '';

  // Expandable rows properties
  expandedRows: { [s: string]: boolean } = {};

  statusOptions = this.enumToOptions(ProjectStatusLabels);
  priorityOptions = this.enumToOptions(TaskPriorityLabels);
  noteStatusOptions = this.enumToOptions(NoteStatusLabels);
  noteTypeOptions = this.enumToOptions(NoteTypeLabels);

  // Dynamic field labels for expandable view
  fieldLabels: { [key: string]: string } = {};

  // Main table columns configuration (what should be visible in the main table)
  mainTableColumns = [
    'title',
    'client',
    'status',
    'priority',
    'dueDate'
  ];

  // Expandable view configuration
  expandableViewConfig = {
    sections: [
      {
        key: 'description',
        title: 'Description',
        icon: 'pi pi-file-edit',
        fields: ['description'],
        type: 'description'
      },
      {
        key: 'projectInfo',
        title: 'Project Information',
        icon: 'pi pi-briefcase',
        fields: ['author', 'taskDetail', 'compilation'],
        type: 'details'
      },
      {
        key: 'statusInfo',
        title: 'Status & Type',
        icon: 'pi pi-info-circle',
        fields: ['noteStatus', 'noteType'],
        type: 'status'
      },
      {
        key: 'dates',
        title: 'Important Dates',
        icon: 'pi pi-calendar',
        fields: ['reportingDate', 'startDate', 'endDate', 'createdDate'],
        type: 'dates'
      },
      {
        key: 'notes',
        title: 'Additional Notes',
        icon: 'pi pi-comment',
        fields: ['notes'],
        type: 'notes'
      }
    ]
  };

  readonly ColumnDataType = ColumnDataType;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private projectNoteService: ProjectNoteService,
    private columnConfigService: ColumnConfigService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeColumns();
    this.subscribeToLoadingState();
    this.loadProjectNotes();
  }

  ngAfterViewInit(): void {
    this.preventDialogScroll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private preventDialogScroll(): void {
    let dialogScrollPosition = 0;

    // Capture scroll position before any interaction
    const captureScrollPosition = () => {
      const dialogContent = document.querySelector('.project-notes-form-dialog .p-dialog-content');
      if (dialogContent) {
        dialogScrollPosition = dialogContent.scrollTop;
      }
    };

    // Restore scroll position
    const restoreScrollPosition = () => {
      const dialogContent = document.querySelector('.project-notes-form-dialog .p-dialog-content');
      if (dialogContent) {
        dialogContent.scrollTop = dialogScrollPosition;
      }
    };

    // Prevent scroll on focus events - ONLY within dialog
    document.addEventListener('focus', (event) => {
      const target = event.target as HTMLElement;
      const dialog = target?.closest('.project-notes-form-dialog');
      if (dialog && target.closest('.project-notes-form-dialog')) {
        captureScrollPosition();
        setTimeout(restoreScrollPosition, 0);
      }
    }, true);

    // Prevent scroll on click events - ONLY within dialog and NOT on table elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const dialog = target?.closest('.project-notes-form-dialog');
      const table = target?.closest('.project-notes-container p-table');

      if (dialog && !table && target.closest('.project-notes-form-dialog')) {
        captureScrollPosition();
        setTimeout(restoreScrollPosition, 10);
      }
    }, true);

    // Prevent scroll on input events - ONLY within dialog
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLElement;
      const dialog = target?.closest('.project-notes-form-dialog');
      if (dialog && target.closest('.project-notes-form-dialog')) {
        captureScrollPosition();
        setTimeout(restoreScrollPosition, 0);
      }
    }, true);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  private initializeForm(): void {
    this.noteForm = this.fb.group({
      id: -1,
      title: ['', [Validators.required, Validators.minLength(VALIDATION_RULES.TITLE_MIN_LENGTH)]],
      name: [''],
      description: ['', [Validators.maxLength(4000)]],
      author: [''],
      client: ['', Validators.required],
      reportingDate: [new Date(), Validators.required],
      dueDate: [new Date(), Validators.required],
      taskDetail: [''],
      compilation: [''],
      status: [ProjectStatus.Active, Validators.required],
      priority: [TaskPriority.Medium, Validators.required],
      noteStatus: [NoteStatus.Draft, Validators.required],
      noteType: [NoteType.General, Validators.required],
      notes: ['', [Validators.maxLength(4000)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      isActive: [true],
      isPublic: [false],
      color: [DEFAULT_PROJECT_NOTE.color],
      createdBy: "Demo User",
    });

    // Subscribe to date changes for validation
    this.noteForm.get('startDate')?.valueChanges.subscribe(() => this.validateDates());
    this.noteForm.get('endDate')?.valueChanges.subscribe(() => this.validateDates());
  }

  private validateDates(): void {
    const startDate = this.noteForm.get('startDate')?.value;
    const endDate = this.noteForm.get('endDate')?.value;

    this.dateValidationError = '';

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Reset time to compare only dates
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < start) {
        this.dateValidationError = 'End date cannot be before start date';
      }
    }
  }

  private initializeColumns(): void {
    try {
      // Get config from service
      const config = this.columnConfigService.getDefaultTableConfiguration();

      // Set columns
      this.columns = config.columns;

      // Set global filter fields
      this.globalFilterFields = this.columnConfigService.getGlobalFilterFields();

      // Initialize field labels from column configurations
      this.initializeFieldLabels();

      // Force change detection
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error initializing columns:', error);

      // Fallback to basic columns if service fails
      this.columns = [
        { field: 'title', header: 'Title', dataType: ColumnDataType.Text, visible: true, sortable: true, width: 'auto' },
        { field: 'client', header: 'Client', dataType: ColumnDataType.Text, visible: true, sortable: true, width: 'auto' },
        { field: 'author', header: 'Author', dataType: ColumnDataType.Text, visible: true, sortable: true, width: 'auto' },
        { field: 'dueDate', header: 'Due Date', dataType: ColumnDataType.Date, visible: true, sortable: true, width: 'auto' },
        { field: 'status', header: 'Status', dataType: ColumnDataType.Enum, visible: true, sortable: true, width: 'auto' }
      ];
      this.globalFilterFields = ['title', 'client', 'author'];
      this.initializeFieldLabels();
    }
  }

  private initializeFieldLabels(): void {
    // Get all column definitions (both visible and hidden)
    const allColumns = this.columnConfigService.getAllColumns();

    // Create a map of field names to their display labels
    this.fieldLabels = {};
    allColumns.forEach(column => {
      this.fieldLabels[column.field] = column.header;
    });

    // Add any additional labels not in the column config
    this.fieldLabels = {
      ...this.fieldLabels,
      // Ensure all fields have labels
      'description': 'Description',
      'notes': 'Additional Notes',
      'taskDetail': 'Task Detail',
      'compilation': 'Compilation',
      'reportingDate': 'Reporting Date',
      'startDate': 'Start Date',
      'endDate': 'End Date',
      'createdDate': 'Created Date',
      'noteStatus': 'Note Status',
      'noteType': 'Note Type'
    };
  }

  // Method to get field label dynamically
  getFieldLabel(field: string): string {
    return this.fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }

  // Method to check if a field has a value
  hasFieldValue(note: any, field: string): boolean {
    const value = note[field];
    return value !== null && value !== undefined && value !== '';
  }

  // Method to check if a section should be visible
  shouldShowSection(note: any, section: any): boolean {
    if (section.type === 'description' || section.type === 'notes') {
      // For description and notes sections, check if the field has content
      return section.fields.some((field: string) => this.hasFieldValue(note, field));
    }
    // For other sections, always show them
    return true;
  }

  // Method to get fields that should be displayed in a section
  getVisibleFields(note: any, section: any): string[] {
    return section.fields.filter((field: string) => {
      if (section.type === 'details') {
        // For details section, only show fields with values
        return this.hasFieldValue(note, field);
      }
      // For dates and status sections, show all fields
      return true;
    });
  }

  // Optimized method for section field visibility
  getVisibleFieldsForSection(note: any, section: any): string[] {
    if (section.type === 'description' || section.type === 'notes') {
      return section.fields.filter((field: string) => this.hasFieldValue(note, field));
    }
    if (section.type === 'details') {
      return section.fields.filter((field: string) => this.hasFieldValue(note, field));
    }
    // For status and dates sections, show all fields
    return section.fields;
  }

  // Method to customize expandable view configuration
  updateExpandableViewConfig(newConfig: any): void {
    this.expandableViewConfig = { ...this.expandableViewConfig, ...newConfig };
  }

  // Method to add a new section to expandable view
  addExpandableSection(section: any): void {
    this.expandableViewConfig.sections.push(section);
  }

  // Method to remove a section from expandable view
  removeExpandableSection(sectionKey: string): void {
    this.expandableViewConfig.sections = this.expandableViewConfig.sections.filter(
      section => section.key !== sectionKey
    );
  }

  // Method to get visible columns for main table
  getMainTableColumns(): TableColumn[] {
    return this.columns.filter(column =>
      this.mainTableColumns.includes(column.field) && column.visible
    );
  }

  // Method to update main table columns configuration
  updateMainTableColumns(newColumns: string[]): void {
    this.mainTableColumns = newColumns;
  }

  // Method to render cell value based on column type
  renderCellValue(note: any, column: TableColumn): any {
    const value = this.getCellValue(note, column.field);

    switch (column.dataType) {
      case ColumnDataType.Date:
        return value;
      case ColumnDataType.Enum:
        return value;
      case ColumnDataType.Boolean:
        return value ? '✓' : '✗';
      default:
        return value;
    }
  }

  // Method to check if cell should render as special component
  shouldRenderAsTag(column: TableColumn): boolean {
    return column.dataType === ColumnDataType.Enum;
  }

  // Method to check if cell should render as date
  shouldRenderAsDate(column: TableColumn): boolean {
    return column.dataType === ColumnDataType.Date;
  }

  // Method to get cell type for optimized rendering
  getCellType(column: TableColumn): string {
    if (this.isTitleField(column.field)) {
      return 'title';
    }
    if (this.shouldRenderAsTag(column)) {
      return 'enum';
    }
    if (this.shouldRenderAsDate(column)) {
      return 'date';
    }
    return 'text';
  }

  // Method to check if field is title (for special title rendering)
  isTitleField(field: string): boolean {
    return field === 'title';
  }

  private loadProjectNotes(): void {
    this.projectNoteService.getAllProjectNotes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.projectNotes = notes;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.showError(error.message || UI_MESSAGES.ERROR.LOAD_FAILED);
        }
      });
  }

  private subscribeToLoadingState(): void {
    this.projectNoteService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  onAdd(): void {
    this.isEditMode = false;
    this.currentNote = null;
    this.noteForm.reset({
      ...DEFAULT_PROJECT_NOTE,
      reportingDate: new Date(),
      dueDate: new Date(),
      startDate: null,
      endDate: null
    });
    this.showFormDialog = true;

    // Reset scroll position after dialog opens
    const dialogContent = document.querySelector('.project-notes-form-dialog .p-dialog-content');
    if (dialogContent) {
      dialogContent.scrollTop = 0;
    }
  }

  onEdit(note: ProjectNote): void {
    this.isEditMode = true;
    this.currentNote = note;
    this.noteForm.patchValue({
      id: note.id,
      title: note.title,
      name: note.name,
      description: note.description,
      author: note.author,
      client: note.client,
      reportingDate: this.parseDate(note.reportingDate),
      dueDate: this.parseDate(note.dueDate),
      taskDetail: note.taskDetail,
      compilation: note.compilation,
      status: note.status,
      priority: note.priority,
      noteStatus: note.noteStatus,
      noteType: note.noteType,
      notes: note.notes,
      startDate: note.startDate ? this.parseDate(note.startDate) : null,
      endDate: note.endDate ? this.parseDate(note.endDate) : null,
      isActive: note.isActive,
      isPublic: note.isPublic,
      color: note.color,
      createdBy: note.createdBy
    });
    this.showFormDialog = true;

    // Reset scroll position after dialog opens
    const dialogContent = document.querySelector('.project-notes-form-dialog .p-dialog-content');
    if (dialogContent) {
      dialogContent.scrollTop = 0;
    }
  }

  onDelete(note: ProjectNote): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${note.title}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteProjectNote(note.id);
      }
    });
  }

  private deleteProjectNote(id: number): void {
    this.projectNoteService.deleteProjectNote(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.projectNotes = this.projectNotes.filter(n => n.id !== id);
          this.showSuccess(UI_MESSAGES.SUCCESS.DELETE);
        },
        error: (error) => {
          this.showError(error.message || UI_MESSAGES.ERROR.DELETE_FAILED);
        }
      });
  }

  onSave(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.noteForm.controls).forEach(key => {
      this.noteForm.get(key)?.markAsTouched();
    });

    // Validate dates
    this.validateDates();

    // Check if form is valid and no date validation errors
    if (this.noteForm.valid && !this.dateValidationError) {
      const formValue = this.noteForm.value;
      const command: UpsertProjectNoteCommand = {
        ...formValue,
        reportingDate: this.formatDateForApi(formValue.reportingDate),
        dueDate: this.formatDateForApi(formValue.dueDate),
        startDate: formValue.startDate ? this.formatDateForApi(formValue.startDate) : null,
        endDate: formValue.endDate ? this.formatDateForApi(formValue.endDate) : null,
        createdBy: "demo user",
      };

      // Remove id field when creating new note
      if (!this.isEditMode || !command.id) {
        delete command.id;
        this.createProjectNote(command);
      } else {
        this.updateProjectNote(command.id, command);
      }
    } else {
      this.markFormGroupTouched(this.noteForm);
    }
  }

  private createProjectNote(command: UpsertProjectNoteCommand): void {
    this.projectNoteService.createProjectNote(command)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.projectNotes = [...this.projectNotes, created];
          this.showSuccess(UI_MESSAGES.SUCCESS.CREATE);
          this.closeDialog();
        },
        error: (error) => {
          this.showError(error.message || UI_MESSAGES.ERROR.CREATE_FAILED);
        }
      });
  }

  private updateProjectNote(id: number, command: UpsertProjectNoteCommand): void {
    this.projectNoteService.updateProjectNote(id, command)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.projectNotes.findIndex(n => n.id === id);
          if (index !== -1) {
            this.projectNotes = [
              ...this.projectNotes.slice(0, index),
              updated,
              ...this.projectNotes.slice(index + 1)
            ];
          }
          this.showSuccess(UI_MESSAGES.SUCCESS.UPDATE);
          this.closeDialog();
        },
        error: (error) => {
          this.showError(error.message || UI_MESSAGES.ERROR.UPDATE_FAILED);
        }
      });
  }

  closeDialog(): void {
    this.showFormDialog = false;
    this.noteForm.reset();
  }

  onRefresh(): void {
    this.loadProjectNotes();
  }

  deleteSelectedNotes(): void {
    if (this.selectedNotes && this.selectedNotes.length > 0) {
      this.confirmationService.confirm({
        message: `Are you sure you want to delete ${this.selectedNotes.length} selected note(s)?`,
        header: 'Confirm Deletion',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          const deletePromises = this.selectedNotes.map(note =>
            this.projectNoteService.deleteProjectNote(note.id).toPromise()
          );

          Promise.all(deletePromises)
            .then(() => {
              const deletedIds = this.selectedNotes.map(n => n.id);
              this.projectNotes = this.projectNotes.filter(n => !deletedIds.includes(n.id));
              this.selectedNotes = [];
              this.showSuccess(`${deletedIds.length} note(s) deleted successfully`);
            })
            .catch((error) => {
              this.showError(error?.message || 'Failed to delete selected notes');
            });
        }
      });
    }
  }

  exportCSV(event: any): void {
    // Implement CSV export functionality
    const csvData = this.convertToCSV(this.projectNotes);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `project-notes-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showSuccess('Data exported successfully');
  }

  private convertToCSV(data: ProjectNote[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(note => {
      return Object.values(note).map(value => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  getVisibleColumns(): TableColumn[] {
    return this.columns;
  }

  getCellValue(rowData: any, field: string): any {
    return rowData[field] ?? '';
  }

  getEnumType(field: string): 'status' | 'priority' | 'noteStatus' | 'noteType' {
    switch (field) {
      case 'status': return 'status';
      case 'priority': return 'priority';
      case 'noteStatus': return 'noteStatus';
      case 'noteType': return 'noteType';
      default: return 'status';
    }
  }

  getSeverity(field: string, value: number): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (field) {
      case 'status':
        // ProjectStatus: Planning, Active, OnHold, Completed, Cancelled
        switch (value) {
          case ProjectStatus.Planning: return 'info';
          case ProjectStatus.Active: return 'success';
          case ProjectStatus.OnHold: return 'warn';
          case ProjectStatus.Completed: return 'info';
          case ProjectStatus.Cancelled: return 'danger';
          default: return 'secondary';
        }
      case 'priority':
        // TaskPriority: Low, Medium, High, Critical
        switch (value) {
          case TaskPriority.Low: return 'info';
          case TaskPriority.Medium: return 'secondary';
          case TaskPriority.High: return 'warn';
          case TaskPriority.Critical: return 'danger';
          default: return 'secondary';
        }
      case 'noteStatus':
        // NoteStatus: Draft, InReview, Published, Archived
        switch (value) {
          case NoteStatus.Draft: return 'warn';
          case NoteStatus.InReview: return 'info';
          case NoteStatus.Published: return 'success';
          case NoteStatus.Archived: return 'secondary';
          default: return 'secondary';
        }
      case 'noteType':
        // NoteType: General, Meeting, Research, Todo, Specification, Documentation, Idea
        switch (value) {
          case NoteType.General: return 'secondary';
          case NoteType.Meeting: return 'info';
          case NoteType.Research: return 'contrast';
          case NoteType.Todo: return 'warn';
          case NoteType.Specification: return 'success';
          case NoteType.Documentation: return 'info';
          case NoteType.Idea: return 'success';
          default: return 'secondary';
        }
      default:
        return 'secondary';
    }
  }

  private parseDate(dateString: string): Date {
    return moment(dateString).toDate();
  }

  private formatDateForApi(date: Date): string {
    return moment(date).format('YYYY-MM-DD');
  }

  private enumToOptions(labels: Record<number, string>): Array<{ label: string; value: number }> {
    return Object.entries(labels).map(([value, label]) => ({
      label,
      value: Number(value)
    }));
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  get dialogHeader(): string {
    return this.isEditMode ? 'Edit Project Note' : 'Add New Project Note';
  }

  // Expandable rows methods
  onRowExpand(event: any): void {
    // Prevent any scroll interference when expanding rows
    setTimeout(() => {
      const tableContainer = document.querySelector('.project-notes-container p-table .p-datatable-wrapper');
      if (tableContainer) {
        // Ensure the expanded row is visible without jumping
        const expandedRow = tableContainer.querySelector(`tr[data-expanded="true"]:last-child`);
        if (expandedRow) {
          expandedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);
  }

  onRowCollapse(event: any): void {
    // Optional: Add any logic when a row is collapsed
  }

  // Optimized expand/collapse methods
  expandAll(): void {
    this.expandedRows = this.projectNotes.reduce((acc, note) => {
      acc[note.id.toString()] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  collapseAll(): void {
    this.expandedRows = {};
  }

}

