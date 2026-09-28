// Count-based donation milestones (phase-2.md 2b). Personal only: never used
// to rank donors against each other.
export const milestoneThresholds = [1, 5, 10, 25, 50] as const;

export function reachedMilestones(confirmedDonations: number): number[] {
  return milestoneThresholds.filter(
    (threshold) => confirmedDonations >= threshold,
  );
}
