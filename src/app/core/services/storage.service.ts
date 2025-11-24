// src/app/core/services/storage.service.ts
import { Injectable, PLATFORM_ID, Inject, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storageType: 'localStorage' | 'sessionStorage' = 'localStorage';
  private isBrowser: boolean;
  private memoryStorage: Map<string, string> = new Map();
  private logger = inject(LoggerService);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    // Check if we're running in the browser or on the server
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setStorageType(type: 'localStorage' | 'sessionStorage'): void {
    this.storageType = type;
  }

  getItem(key: string): string | null {
    if (!this.isBrowser) {
      return this.memoryStorage.get(key) || null;
    }

    try {
      return window[this.storageType].getItem(key);
    } catch (error) {
      this.logger.error('Error accessing storage', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isBrowser) {
      this.memoryStorage.set(key, value);
      return;
    }

    try {
      window[this.storageType].setItem(key, value);
    } catch (error) {
      this.logger.error('Error setting item in storage:', error);
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) {
      this.memoryStorage.delete(key);
      return;
    }

    try {
      window[this.storageType].removeItem(key);
    } catch (error) {
      this.logger.error('Error removing item from storage:', error);
    }
  }

  clear(): void {
    if (!this.isBrowser) {
      this.memoryStorage.clear();
      return;
    }

    try {
      window[this.storageType].clear();
    } catch (error) {
      this.logger.error('Error clearing storage:', error);
    }
  }
}
