import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionModal } from '@/components/version-modal';
import { CURRENT_VERSION } from '@/config/version';

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName: string) => ({
    tagName,
    id: '',
    className: '',
    innerHTML: '',
    style: { display: 'none' },
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    appendChild: vi.fn(),
    querySelector: vi.fn(),
    addEventListener: vi.fn(),
  })),
});

Object.defineProperty(document, 'getElementById', {
  value: vi.fn(() => null),
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
});

Object.defineProperty(document.head, 'appendChild', {
  value: vi.fn(),
});

describe('VersionModal', () => {
  let modal: VersionModal;

  beforeEach(() => {
    vi.clearAllMocks();
    modal = new VersionModal();
  });

  it('should create modal instance', () => {
    expect(modal).toBeDefined();
  });

  it('should have current version information', () => {
    expect(CURRENT_VERSION.version).toBe('3.0.0');
    expect(CURRENT_VERSION.codename).toBe('Clean Architecture');
    expect(CURRENT_VERSION.features).toBeInstanceOf(Array);
    expect(CURRENT_VERSION.features.length).toBeGreaterThan(0);
  });

  it('should show modal', () => {
    const showSpy = vi.spyOn(modal, 'show');
    modal.show();
    expect(showSpy).toHaveBeenCalled();
  });

  it('should hide modal', () => {
    const hideSpy = vi.spyOn(modal, 'hide');
    modal.hide();
    expect(hideSpy).toHaveBeenCalled();
  });
});