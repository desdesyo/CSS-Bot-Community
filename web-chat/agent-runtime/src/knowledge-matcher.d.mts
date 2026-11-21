export interface KnowledgeEntry {
  id?: string;
  queryText?: string;
  content?: string;
  threadId?: number;
  sourceProvider?: string;
  answerQuality?: string;
  reviewRequired?: boolean;
  reviewStatus?: string;
}
export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
  coverage: number;
  overlap: number;
  answer: string;
  answerUsable: boolean;
  minimumOverlap: number;
}
export function normalizeKnowledgeTokens(value: string): string[];
export function rankKnowledgeEntries(prompt: string, entries: KnowledgeEntry[]): KnowledgeMatch[];
export function selectKnowledgeEntry(prompt: string, entries: KnowledgeEntry[]): KnowledgeMatch | null;
