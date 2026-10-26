export type QueryIntent = {
  terms: string[];
  wantsProjects: boolean;
  wantsPeople: boolean;
  wantsContribution: boolean;
  wantsActiveAsk: boolean;
};

const aliases: Record<string, string[]> = {
  hardware: ["hardware", "physical computing", "embedded", "electronics", "prototyping"],
  design: ["design", "product design", "creative direction", "creative technology", "motion graphics", "visual"],
  solidity: ["solidity", "smart contracts", "protocol", "onchain", "onchain integrations"],
  research: ["research", "research synthesis", "analysis", "writing"],
  community: ["community", "community building", "events", "organizer", "gatherings"],
  art: ["art", "artist", "generative systems", "cultural programming"],
  tooling: ["tooling", "tools", "developer tools", "systems"],
  governance: ["governance", "coordination", "reputation"],
};

const stopWords = new Set(["who", "what", "where", "should", "i", "talk", "to", "about", "can", "help", "with", "is", "are", "the", "a", "an", "for", "this", "weekend", "and", "on", "in", "need", "needs", "looking", "working", "interested", "involved", "contribute"]);

export function interpretQuery(query: string): QueryIntent {
  const normalized = query.toLowerCase();
  const terms = new Set<string>();
  for (const token of normalized.split(/[^a-z0-9]+/).filter(Boolean)) if (!stopWords.has(token) && token.length > 2) terms.add(token);
  for (const [key, values] of Object.entries(aliases)) if (values.some((value) => normalized.includes(value))) { terms.add(key); values.forEach((value) => terms.add(value)); }
  return {
    terms: [...terms],
    wantsProjects: /project|projects|where can i contribute|contribute/.test(normalized),
    wantsPeople: /who|talk to|person|people/.test(normalized),
    wantsContribution: /contribute|help out|weekend|where can i/.test(normalized),
    wantsActiveAsk: /looking for|need|needs|collaborat|feedback|help with/.test(normalized),
  };
}
