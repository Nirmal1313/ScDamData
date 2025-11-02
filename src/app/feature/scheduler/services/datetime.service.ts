import { Injectable } from '@angular/core';
import moment from 'moment';
import { EventFormData } from '../models';
import { IDateTimeService } from '../interfaces/scheduler-service.interfaces';

@Injectable({
  providedIn: 'root'
})
export class DateTimeService implements IDateTimeService {

  combineDateTime(date: Date, time: string): string {
    return moment(date).format('YYYY-MM-DD') + 'T' + time + ':00';
  }

  autoCorrectDates(currentEvent: EventFormData): void {
    const start = moment(currentEvent.start);
    const end = moment(currentEvent.end);

    if (start.isSameOrAfter(end)) {
      const correctedEnd = start.clone().add(1, 'hour');
      currentEvent.end = correctedEnd.format('YYYY-MM-DDTHH:mm:ss');

      // Also update the stepwise fields
      currentEvent.endDate = correctedEnd.toDate();
      currentEvent.endTime = correctedEnd.format('HH:mm');
    }
  }

  setupDateValidation(): { minSelectableDate: Date; maxSelectableDate: Date } {
    const minSelectableDate = moment().startOf('day').toDate();
    const maxSelectableDate = moment().add(2, 'years').startOf('day').toDate();

    return { minSelectableDate, maxSelectableDate };
  }

  formatMomentDateTime(date: string | Date | any): string {
    return moment(date).format('DD/MM/YYYY HH:mm');
  }

  getCurrentSelectionStep(currentEvent: EventFormData, isAllDayEvent: boolean): number {
    if (!currentEvent.startDate || !currentEvent.endDate) {
      return 1; // Need dates
    }
    if (!isAllDayEvent && (!currentEvent.startTime || !currentEvent.endTime)) {
      return 2; // Need times
    }
    return 3; // Complete
  }

  getSelectionStepMessage(currentEvent: EventFormData, isAllDayEvent: boolean): string {
    const step = this.getCurrentSelectionStep(currentEvent, isAllDayEvent);
    switch (step) {
      case 1:
        return 'Select start and end dates for your event.';
      case 2:
        return 'Select start and end times for your event.';
      case 3:
        return 'Your event is ready to save!';
      default:
        return 'Complete the form to create your event.';
    }
  }
}
