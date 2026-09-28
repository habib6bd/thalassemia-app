import { reachedMilestones } from "@/features/history/milestones";

describe("reachedMilestones", () => {
  it("returns nothing before the first donation", () => {
    expect(reachedMilestones(0)).toEqual([]);
  });

  it("includes every threshold reached so far", () => {
    expect(reachedMilestones(1)).toEqual([1]);
    expect(reachedMilestones(7)).toEqual([1, 5]);
    expect(reachedMilestones(50)).toEqual([1, 5, 10, 25, 50]);
    expect(reachedMilestones(120)).toEqual([1, 5, 10, 25, 50]);
  });
});
