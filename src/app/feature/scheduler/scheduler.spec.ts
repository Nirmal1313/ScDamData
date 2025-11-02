import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Scheduler } from './scheduler';

describe('Scheduler', () => {
  let component: Scheduler;
  let fixture: ComponentFixture<Scheduler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Scheduler]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Scheduler);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
