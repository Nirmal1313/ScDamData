import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Sidebar } from './sidebar';
import { BomWeatherService } from '../../core/services/bom-weather.service';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let mockBomWeatherService: jasmine.SpyObj<BomWeatherService>;

  beforeEach(async () => {
    // Create a mock BomWeatherService
    mockBomWeatherService = jasmine.createSpyObj('BomWeatherService', ['getWeatherData'], {
      weatherState$: of({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
        callCount: 0
      })
    });
    mockBomWeatherService.getWeatherData.and.returnValue(of({
      timestamp: '2025-11-17T10:00:00',
      locations: {}
    }));

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: BomWeatherService, useValue: mockBomWeatherService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty weather data arrays', () => {
    expect(component.rowsWeather).toEqual([]);
    expect(component.forecastWeather).toEqual([]);
    expect(component.weekdaysWeather).toEqual([]);
  });

  it('should call getWeatherData on init', () => {
    expect(mockBomWeatherService.getWeatherData).toHaveBeenCalled();
  });
});
