import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "../utils";
import { PaymentStatus, SettlementStatus } from "../types";

describe("STATUS_COLORS", () => {
  it("has a color entry for every PaymentStatus value", () => {
    const missing = Object.values(PaymentStatus).filter(
      (status) => !(status in STATUS_COLORS)
    );
    expect(missing).toEqual([]);
  });

  it("has a color entry for every SettlementStatus value", () => {
    const missing = Object.values(SettlementStatus).filter(
      (status) => !(status in STATUS_COLORS)
    );
    expect(missing).toEqual([]);
  });

  it("does not resolve any known status to the default color unexpectedly", () => {
    const knownStatuses = [
      ...Object.values(PaymentStatus),
      ...Object.values(SettlementStatus),
    ];

    const fallingBack = knownStatuses.filter(
      (status) => STATUS_COLORS[status] === DEFAULT_STATUS_COLOR
    );

    expect(fallingBack).toEqual([]);
  });
});
