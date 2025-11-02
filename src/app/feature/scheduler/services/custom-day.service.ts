import { Injectable } from '@angular/core';
import moment from 'moment';
import { CustomDaySelection, WeekdaySelection } from '../models';
import { ICustomDayService } from '../interfaces/scheduler-service.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CustomDayService implements ICustomDayService {

  generateCustomDaysForPattern(customDaySelection: CustomDaySelection): Date[] {
    const start = moment(customDaySelection.startRange);
    const end = moment(customDaySelection.endRange);
    const selectedDays: Date[] = [];

    if (start.isAfter(end)) {
      return selectedDays;
    }

    switch (customDaySelection.pattern) {
      case 'weekdays':
        this.generateWeekdays(start, end, selectedDays);
        break;
      case 'weekends':
        this.generateWeekends(start, end, selectedDays);
        break;
      case 'interval':
        this.generateIntervalDays(start, end, selectedDays, customDaySelection.intervalDays || 1);
        break;
      case 'specific':
      default:
        // For specific days, user will manually select
        break;
    }

    return selectedDays;
  }

  private generateWeekdays(start: moment.Moment, end: moment.Moment, selectedDays: Date[]): void {
    let weekdayIterator = start.clone();
    while (weekdayIterator.isSameOrBefore(end)) {
      if (weekdayIterator.day() >= 1 && weekdayIterator.day() <= 5) {
        selectedDays.push(weekdayIterator.toDate());
      }
      weekdayIterator.add(1, 'day');
    }
  }

  private generateWeekends(start: moment.Moment, end: moment.Moment, selectedDays: Date[]): void {
    let weekendIterator = start.clone();
    while (weekendIterator.isSameOrBefore(end)) {
      if (weekendIterator.day() === 0 || weekendIterator.day() === 6) {
        selectedDays.push(weekendIterator.toDate());
      }
      weekendIterator.add(1, 'day');
    }
  }

  private generateIntervalDays(start: moment.Moment, end: moment.Moment, selectedDays: Date[], intervalDays: number): void {
    let intervalIterator = start.clone();
    while (intervalIterator.isSameOrBefore(end)) {
      selectedDays.push(intervalIterator.toDate());
      intervalIterator.add(intervalDays, 'days');
    }
  }

  getSelectedWeekdayNumbers(weekdaySelection: WeekdaySelection): number[] {
    const weekdayNumbers: number[] = [];
    if (weekdaySelection.sunday) weekdayNumbers.push(0);
    if (weekdaySelection.monday) weekdayNumbers.push(1);
    if (weekdaySelection.tuesday) weekdayNumbers.push(2);
    if (weekdaySelection.wednesday) weekdayNumbers.push(3);
    if (weekdaySelection.thursday) weekdayNumbers.push(4);
    if (weekdaySelection.friday) weekdayNumbers.push(5);
    if (weekdaySelection.saturday) weekdayNumbers.push(6);
    return weekdayNumbers;
  }
}
