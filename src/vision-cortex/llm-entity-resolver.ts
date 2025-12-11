import { EventEmitter } from "events";
import { OllamaClient } from "../utils/ollama-client";
import type { Signal } from "./scoring-engine";

export interface Entity {
  entityId: string;
  type: "company" | "property" | "person";
  canonicalName: string;
  aliases: string[];
  identifiers: Record<string, string>;
  signals: Signal[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionMatch {
  entityId: string;
  matchScore: number;
  matchReasons: string[];
}

export interface LLMResolutionResult {
  matched: boolean;
  confidence: number;
  reasoning: string;
  suggestedCanonicalName?: string;
}

export class LLMEntityResolver extends EventEmitter {
  private entities: Map<string, Entity> = new Map();
  private identifierIndex: Map<string, string> = new Map();
  private ollama: OllamaClient;
  private useLLM: boolean = true;

  constructor(ollamaConfig?: { baseUrl?: string; model?: string }) {
    super();
    this.ollama = new OllamaClient(ollamaConfig);
    this.ollama.on("health:checked", (data) => {
      this.useLLM = data.status === "healthy";
      this.emit("resolver:llm-status", { available: this.useLLM, reason: data.status });
    });
    this.ollama.on("health:error", () => {
      this.useLLM = false;
    });
  }

  async initialize(): Promise<void> {
    const healthy = await this.ollama.healthCheck();
    this.useLLM = healthy;
    this.emit("resolver:initialized", { mode: healthy ? "llm-enhanced" : "rules-based" });
  }

  async resolveEntity(signal: Signal): Promise<Entity> {
    const identifierMatch = this.matchByIdentifier(signal);
    if (identifierMatch && identifierMatch.matchScore >= 0.95) {
      return this.addSignalToEntity(identifierMatch.entityId, signal);
    }
    if (this.useLLM) {
      try {
        const llmMatch = await this.matchByLLM(signal);
        if (llmMatch.matched && llmMatch.confidence >= 0.85) {
          const existingEntity = Array.from(this.entities.values()).find(
            (e) => e.canonicalName.toLowerCase() === (llmMatch.suggestedCanonicalName || "").toLowerCase()
          );
          if (existingEntity) {
            return this.addSignalToEntity(existingEntity.entityId, signal);
          }
        }
      } catch (error) {
        this.useLLM = false;
      }
    }
    const nameMatch = this.matchByName(signal);
    if (nameMatch && nameMatch.matchScore >= 0.85) {
      return this.addSignalToEntity(nameMatch.entityId, signal);
    }
    return this.createEntity(signal);
  }

  private async matchByLLM(signal: Signal): Promise<LLMResolutionResult> {
    const prompt = `You are an entity resolution expert. Given a new entity mention, determine if it matches an existing entity in our database.\nNew entity:\n- Name: ${signal.entity.name}\n- Type: ${signal.entity.type}\n- Identifiers: ${JSON.stringify(signal.entity.identifiers || {})}\nExisting entities (sample):\n${Array.from(this.entities.values()).map((e, i) => `${i + 1}. ${e.canonicalName}`).slice(0, 10).join("\n")}\nQuestion: Does the new entity match any existing entity? If yes, which one and why? If no, explain why.\nRespond with JSON:{\n  \"matched\": boolean,\n  \"confidence\": number (0-1),\n  \"reasoning\": \"explanation\",\n  \"suggestedCanonicalName\": \"if matched, the canonical name\"\n}`;
    try {
      return await this.ollama.generateJSON<LLMResolutionResult>(prompt);
    } catch {
      return { matched: false, confidence: 0, reasoning: "LLM error" };
    }
  }

  private matchByIdentifier(signal: Signal): ResolutionMatch | null {
    const identifiers = signal.entity.identifiers || {};
    for (const [key, value] of Object.entries(identifiers)) {
      if (!value) continue;
      const entityId = this.identifierIndex.get(value);
      if (entityId) {
        return { entityId, matchScore: 0.99, matchReasons: [`Identifier match: ${key} = ${value}`] };
      }
    }
    return null;
  }

  private matchByName(signal: Signal): ResolutionMatch | null {
    const candidates: ResolutionMatch[] = [];
    for (const [entityId, entity] of this.entities) {
      const nameScore = this.fuzzyMatchScore(signal.entity.name, entity.canonicalName);
      if (nameScore >= 0.85) {
        candidates.push({ entityId, matchScore: nameScore, matchReasons: [`Fuzzy name match: \"${signal.entity.name}\" â‰ˆ \"${entity.canonicalName}\"`] });
      }
      for (const alias of entity.aliases) {
        const aliasScore = this.fuzzyMatchScore(signal.entity.name, alias);
        if (aliasScore >= 0.85 && aliasScore > nameScore) {
          candidates.push({ entityId, matchScore: aliasScore, matchReasons: [`Alias match: \"${signal.entity.name}\" â‰ˆ \"${alias}\"`] });
        }
      }
    }
    return candidates.sort((a, b) => b.matchScore - a.matchScore)[0] || null;
  }

  private fuzzyMatchScore(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0]![j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(matrix[i - 1]![j - 1]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j]! + 1);
        }
      }
    }
    return matrix[str2.length]![str1.length]!;
  }

  private addSignalToEntity(entityId: string, signal: Signal): Entity {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found`);
    entity.signals.push(signal);
    entity.updatedAt = new Date();
    return entity;
  }

  private createEntity(signal: Signal): Entity {
    const entityId = `${signal.entity.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entity: Entity = {
      entityId,
      type: signal.entity.type,
      canonicalName: signal.entity.name,
      aliases: [],
      identifiers: signal.entity.identifiers || {},
      signals: [signal],
      confidence: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.entities.set(entityId, entity);
    for (const [key, value] of Object.entries(entity.identifiers)) {
      if (value) this.identifierIndex.set(value, entityId);
    }
    return entity;
  }

  getStats(): { totalEntities: number; totalSignals: number; llmMode: boolean } {
    let totalSignals = 0;
    for (const entity of this.entities.values()) {
      totalSignals += entity.signals.length;
    }
    return {
      totalEntities: this.entities.size,
      totalSignals,
      llmMode: this.useLLM,
    };
  }

  searchEntities(query: string, limit = 10): Entity[] {
    const q = query.toLowerCase();
    return Array.from(this.entities.values())
      .filter((e) => e.canonicalName.toLowerCase().includes(q))
      .slice(0, limit);
  }

  getEntityTimeline(entityId: string): Signal[] {
    const entity = this.entities.get(entityId);
    return entity ? entity.signals : [];
  }
}


