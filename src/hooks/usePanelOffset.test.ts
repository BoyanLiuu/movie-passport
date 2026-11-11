import { describe, expect, it } from "vitest";
import { panelOffset } from "./usePanelOffset";

describe("panelOffset", () => {
  const desktop = { width: 1280, height: 720 };
  const phone = { width: 412, height: 915 };

  it("shifts left for a panel on the right", () => {
    expect(panelOffset({ left: 936, top: 96 }, desktop)).toEqual([-172, 0]);
  });

  it("shifts up for a bottom sheet", () => {
    expect(panelOffset({ left: 12, top: 515 }, phone)).toEqual([0, -200]);
  });

  it("centres in the band between the top overlay and the sheet", () => {
    // Free band 140..515: its middle (327.5) is 130 px above the screen's (457.5).
    expect(panelOffset({ left: 12, top: 515 }, phone, 140)).toEqual([0, -130]);
  });

  it("ignores the top overlay beside a right-hand panel", () => {
    expect(panelOffset({ left: 936, top: 96 }, desktop, 70)).toEqual([-172, 0]);
  });
});
