// Fixed educational example of autosomal recessive inheritance (§16).
// It takes no personal input and stores nothing: the two scenarios are
// hard-coded, and the grid is derived from them.

export type Gene = "typical" | "changed";
export type Parent = "carrier" | "nonCarrier";
export type ChildOutcome = "notCarrier" | "carrier" | "thalassemia";

export const scenarios = {
  carrierCarrier: ["carrier", "carrier"],
  carrierNonCarrier: ["carrier", "nonCarrier"],
} as const satisfies Record<string, readonly [Parent, Parent]>;
export type Scenario = keyof typeof scenarios;

const genesOf: Record<Parent, readonly [Gene, Gene]> = {
  carrier: ["typical", "changed"],
  nonCarrier: ["typical", "typical"],
};

function outcomeOf(a: Gene, b: Gene): ChildOutcome {
  const changed = [a, b].filter((gene) => gene === "changed").length;
  if (changed === 0) return "notCarrier";
  if (changed === 1) return "carrier";
  return "thalassemia";
}

export type GridCell = { fromA: Gene; fromB: Gene; outcome: ChildOutcome };

/** The 2 × 2 grid: one gene from each parent per box. */
export function inheritanceGrid(scenario: Scenario): GridCell[] {
  const [parentA, parentB] = scenarios[scenario];
  return genesOf[parentA].flatMap((fromA) =>
    genesOf[parentB].map((fromB) => ({
      fromA,
      fromB,
      outcome: outcomeOf(fromA, fromB),
    })),
  );
}

/** How many of the 4 boxes show each outcome. */
export function outcomeCounts(
  scenario: Scenario,
): Record<ChildOutcome, number> {
  const counts: Record<ChildOutcome, number> = {
    notCarrier: 0,
    carrier: 0,
    thalassemia: 0,
  };
  for (const cell of inheritanceGrid(scenario)) counts[cell.outcome] += 1;
  return counts;
}
