import type { Skill } from "./types";

export interface RefinementBranch {
  id: string;
  title: string;
  copy: string;
  options: string[];
}

const branches: Array<RefinementBranch & { matches: string[] }> = [
  {
    id: "solidity",
    matches: ["solidity"],
    title: "What part of Solidity feels most like your work?",
    copy: "This is optional. It helps the right people find you without adding noise.",
    options: ["Smart contracts", "Protocol design", "Security", "Onchain integrations"],
  },
  {
    id: "hardware",
    matches: ["hardware prototyping", "hardware"],
    title: "What kind of hardware work are you drawn to?",
    copy: "Optional — keep the signal only if it feels useful.",
    options: ["Physical computing", "Embedded systems", "Rapid prototyping"],
  },
];

export function getCapabilityRefinement(capabilities: Skill[]): RefinementBranch | null {
  const labels = capabilities.map((capability) => capability.label.toLowerCase());
  return branches.find((branch) => branch.matches.some((match) => labels.includes(match))) || null;
}
