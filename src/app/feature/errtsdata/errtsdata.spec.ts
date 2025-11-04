import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ERRTSData } from './errtsdata';

describe('ERRTSData', () => {
  let component: ERRTSData;
  let fixture: ComponentFixture<ERRTSData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ERRTSData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ERRTSData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
