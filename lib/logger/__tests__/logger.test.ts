/**
 * Tests for logger module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logInfo, logWarn, logError } from '../logger';

describe('Logger', () => {
  let consoleInfoSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logInfo', () => {
    it('should log info message without context', () => {
      logInfo('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test info message')
      );
    });

    it('should log info message with context', () => {
      const context = { userId: '123', action: 'create' };
      logInfo('Test info message', context);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test info message')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"123"')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"action":"create"')
      );
    });
  });

  describe('logWarn', () => {
    it('should log warning message without context', () => {
      logWarn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message')
      );
    });

    it('should log warning message with context', () => {
      const context = { field: 'value' };
      logWarn('Test warning message', context);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"field":"value"')
      );
    });
  });

  describe('logError', () => {
    it('should log error message without context', () => {
      logError('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });

    it('should log error message with context', () => {
      const context = { error: 'details' };
      logError('Test error message', context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"error":"details"')
      );
    });
  });

  describe('log format', () => {
    it('should include timestamp in log message', () => {
      logInfo('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('should include log level in correct format', () => {
      logInfo('Info');
      logWarn('Warn');
      logError('Error');

      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });
  });
});
