/** Injectable clock so time-dependent logic (reservations, expiry) can be tested. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Manually controlled clock for tests. */
export class FixedClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date()) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = new Date(date);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}
