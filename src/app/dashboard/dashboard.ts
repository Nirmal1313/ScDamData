import { Header } from './../shared/header/header';
import { Sidebar } from './../shared/sidebar/sidebar';
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { WeatherService } from '../core/services/weather.service';
import { finalize } from 'rxjs/operators';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { Scheduler } from '../feature/scheduler/scheduler';
import { Monitoring } from '../feature/monitoring/monitoring';
import { Notes } from '../feature/notes/notes';
import { ERRTSData } from '../feature/errtsdata/errtsdata';
@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    CardModule,
    RippleModule,
    DividerModule,
    Sidebar,
    Header,
    Scheduler,
    Monitoring,
    Notes,
    ERRTSData,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  sidebarVisible: boolean = false;

  // Inject WeatherService to initialize it
  // The service will automatically fetch weather data after login
  constructor(private weatherService: WeatherService) {}

  onHeaderSidebarToggle(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  onSidebarToggleChange(visible: boolean): void {
    this.sidebarVisible = visible;
  }
}
