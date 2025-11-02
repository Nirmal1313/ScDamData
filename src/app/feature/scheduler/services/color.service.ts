import { Injectable } from '@angular/core';
import { IColorService } from '../interfaces/scheduler-service.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ColorService implements IColorService {

  lightenColor(color: string, factor: number): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Lighten the color
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
      .toString(16)
      .padStart(2, '0')}`;
  }

  getDefaultEventColors(): { primary: string; secondary: string } {
    return {
      primary: '#ad2121',
      secondary: '#FAE3E3'
    };
  }
}
