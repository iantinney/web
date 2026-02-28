import { describe, it, expect } from "vitest";
import { updateSM2, getNextDueDate, userAnswerToQuality } from "../sm2";
import type { SM2State } from "../sm2";

describe("sm2 - updateSM2", () => {
  it("resets repetitionCount to 0 and interval to 1 on quality < 3 (quality=0)", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const result = updateSM2(state, 0);
    expect(result.repetitionCount).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("resets repetitionCount to 0 and interval to 1 on quality=2 (below threshold)", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 6, repetitionCount: 3 };
    const result = updateSM2(state, 2);
    expect(result.repetitionCount).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("increments repetitionCount to 1 and sets interval=1 for first correct (quality=5)", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const result = updateSM2(state, 5);
    expect(result.repetitionCount).toBe(1);
    expect(result.interval).toBe(1);
  });

  it("increments repetitionCount to 2 and sets interval=3 for second correct (quality=5)", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 1 };
    const result = updateSM2(state, 5);
    expect(result.repetitionCount).toBe(2);
    expect(result.interval).toBe(3);
  });

  it("uses interval * easeFactor for repetitionCount >= 3 (quality=5)", () => {
    // After 2nd correct, repetitionCount=2, interval=3
    // 3rd correct: repetitionCount=3, interval=Math.round(3 * 2.6) = 8
    // Note: easeFactor updates AFTER interval, so we need the updated easeFactor
    // With quality=5: easeFactor = 2.5 + (0.1 - (5-5)*(0.08+(5-5)*0.02)) = 2.5 + 0.1 = 2.6
    const state: SM2State = { easeFactor: 2.5, interval: 3, repetitionCount: 2 };
    const result = updateSM2(state, 5);
    expect(result.repetitionCount).toBe(3);
    // interval = Math.round(3 * 2.6) = 8 (using updated easeFactor 2.6)
    expect(result.interval).toBe(8);
  });

  it("does not mutate the input state", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const originalState = { ...state };
    updateSM2(state, 5);
    expect(state.easeFactor).toBe(originalState.easeFactor);
    expect(state.interval).toBe(originalState.interval);
    expect(state.repetitionCount).toBe(originalState.repetitionCount);
  });

  it("still updates easeFactor on quality < 3", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const result = updateSM2(state, 0);
    // easeFactor = max(1.3, 2.5 + (0.1 - (5-0)*(0.08 + (5-0)*0.02)))
    //            = max(1.3, 2.5 + (0.1 - 5*(0.08 + 5*0.02)))
    //            = max(1.3, 2.5 + (0.1 - 5*(0.08 + 0.10)))
    //            = max(1.3, 2.5 + (0.1 - 5*0.18))
    //            = max(1.3, 2.5 + (0.1 - 0.90))
    //            = max(1.3, 2.5 - 0.80)
    //            = max(1.3, 1.70) = 1.70
    expect(result.easeFactor).toBeCloseTo(1.7, 5);
  });

  it("easeFactor is always >= 1.3 regardless of incorrect streaks", () => {
    let state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    // Apply many quality=0 answers to drive easeFactor down
    for (let i = 0; i < 20; i++) {
      state = updateSM2(state, 0);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("easeFactor increases on quality=5 answers", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const result = updateSM2(state, 5);
    // easeFactor = max(1.3, 2.5 + (0.1 - 0*(0.08+0*0.02))) = max(1.3, 2.6) = 2.6
    expect(result.easeFactor).toBeCloseTo(2.6, 5);
  });

  it("quality=3 gives neutral easeFactor change", () => {
    const state: SM2State = { easeFactor: 2.5, interval: 1, repetitionCount: 0 };
    const result = updateSM2(state, 3);
    // easeFactor = max(1.3, 2.5 + (0.1 - (5-3)*(0.08+(5-3)*0.02)))
    //            = max(1.3, 2.5 + (0.1 - 2*(0.08+2*0.02)))
    //            = max(1.3, 2.5 + (0.1 - 2*(0.12)))
    //            = max(1.3, 2.5 + (0.1 - 0.24))
    //            = max(1.3, 2.5 - 0.14)
    //            = max(1.3, 2.36) = 2.36
    expect(result.easeFactor).toBeCloseTo(2.36, 5);
  });
});

describe("sm2 - getNextDueDate", () => {
  it("returns a Date object", () => {
    const result = getNextDueDate(1);
    expect(result).toBeInstanceOf(Date);
  });

  it("returns approximately today + 1 day for interval=1", () => {
    const before = new Date();
    const result = getNextDueDate(1);
    const after = new Date();

    const expectedMin = new Date(before);
    expectedMin.setDate(expectedMin.getDate() + 1);

    const expectedMax = new Date(after);
    expectedMax.setDate(expectedMax.getDate() + 1);

    expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });

  it("returns approximately today + 3 days for interval=3", () => {
    const before = new Date();
    const result = getNextDueDate(3);
    const after = new Date();

    const expectedMin = new Date(before);
    expectedMin.setDate(expectedMin.getDate() + 3);

    const expectedMax = new Date(after);
    expectedMax.setDate(expectedMax.getDate() + 3);

    expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });
});

describe("sm2 - userAnswerToQuality", () => {
  it("returns 1 for incorrect answer regardless of time", () => {
    expect(userAnswerToQuality(false, 5000)).toBe(1);
    expect(userAnswerToQuality(false, 0)).toBe(1);
    expect(userAnswerToQuality(false, 60000)).toBe(1);
  });

  it("returns 5 for correct answer under 10 seconds (fast)", () => {
    expect(userAnswerToQuality(true, 5000)).toBe(5);
    expect(userAnswerToQuality(true, 9999)).toBe(5);
    expect(userAnswerToQuality(true, 0)).toBe(5);
  });

  it("returns 4 for correct answer between 10 and 30 seconds", () => {
    expect(userAnswerToQuality(true, 10000)).toBe(4);
    expect(userAnswerToQuality(true, 15000)).toBe(4);
    expect(userAnswerToQuality(true, 29999)).toBe(4);
  });

  it("returns 3 for correct answer at or over 30 seconds (slow)", () => {
    expect(userAnswerToQuality(true, 30000)).toBe(3);
    expect(userAnswerToQuality(true, 35000)).toBe(3);
    expect(userAnswerToQuality(true, 100000)).toBe(3);
  });
});
