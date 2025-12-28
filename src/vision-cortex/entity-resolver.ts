/**
 * Entity Resolution System - Deduplicate companies/properties/people across 50+ data sources
 *
 * Solves the identity problem: same entity appears with different names/addresses across sources
 * - "Apple Inc" vs "Apple Computer" vs "AAPL" vs "Apple, Inc."
 * - "123 Main St" vs "123 Main Street, Apt 1" vs parcel ID "12-345-67"
 * - "John Smith CEO" vs "J. Smith" vs LinkedIn profile
 *
 * Maintains entity timeline of all triggers across sources for complete context
 */

import { EventEmitter } from "events";
import type { Signal } from "./scoring-engine";

export interface Entity {
  entityId: string;
  type: "company" | "property" | "person";
  canonicalName: string;
  aliases: string[];
  identifiers: {
    ein?: string; // Company EIN
    duns?: string; // D&B number
    apn?: string; // Property parcel ID
    address?: string;
    linkedinUrl?: string;
    crunchbaseUrl?: string;
    secCik?: string;
    [key: string]: string | undefined;
  };
  signals: Signal[];
  confidence: number; // 0-1 (how sure we are this is same entity)
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionMatch {
  entityId: string;
  matchScore: number; // 0-1
  matchReasons: string[];
}

export class EntityResolver extends EventEmitter {
  private entities: Map<string, Entity> = new Map();
  private aliasIndex: Map<string, Set<string>> = new Map(); // alias -> entityIds
  private identifierIndex: Map<string, string> = new Map(); // identifier -> entityId

  /**
   * Resolve a signal to an existing entity or create new one
   */
  resolveEntity(signal: Signal): Entity {
    // Try exact identifier match first (EIN, DUNS, APN, etc.)
    const identifierMatch = this.matchByIdentifier(signal);
    if (identifierMatch && identifierMatch.matchScore >= 0.95) {
      return this.addSignalToEntity(identifierMatch.entityId, signal);
    }

    // Try fuzzy name matching
    const nameMatch = this.matchByName(signal);
    if (nameMatch && nameMatch.matchScore >= 0.85) {
      return this.addSignalToEntity(nameMatch.entityId, signal);
    }

    // No match - create new entity
    return this.createEntity(signal);
  }

  /**
   * Match entity by unique identifiers (EIN, DUNS, APN, LinkedIn URL, etc.)
   */
  private matchByIdentifier(signal: Signal): ResolutionMatch | null {
    const identifiers = this.extractIdentifiers(signal);

    for (const [key, value] of Object.entries(identifiers)) {
      const indexKey = `${key}:${value}`;
      const entityId = this.identifierIndex.get(indexKey);

      if (entityId) {
        return {
          entityId,
          matchScore: 1.0, // Perfect match
          matchReasons: [`Exact ${key} match: ${value}`],
        };
      }
    }

    return null;
  }

  /**
   * Match entity by fuzzy name matching (handle typos, abbreviations, etc.)
   */
  private matchByName(signal: Signal): ResolutionMatch | null {
    const name = this.normalizeName(signal.entity.name);
    const nameTokens = new Set(name.split(/\s+/));

    let bestMatch: ResolutionMatch | null = null;
    let bestScore = 0;

    // Check against all known aliases
    for (const [alias, entityIds] of this.aliasIndex.entries()) {
      const aliasTokens = new Set(alias.split(/\s+/));
      const score = this.calculateNameSimilarity(nameTokens, aliasTokens);

      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        const entityId = Array.from(entityIds)[0]; // Take first if multiple
        bestMatch = {
          entityId: entityId!,
          matchScore: score,
          matchReasons: [`Name similarity: ${(score * 100).toFixed(0)}%`],
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate name similarity using Jaccard index + fuzzy token matching
   */
  private calculateNameSimilarity(
    tokens1: Set<string>,
    tokens2: Set<string>
  ): number {
    // Jaccard similarity: |A âˆ© B| / |A âˆª B|
    const intersection = new Set(
      Array.from(tokens1).filter((token) => tokens2.has(token))
    );
    const union = new Set([...tokens1, ...tokens2]);

    const jaccard = intersection.size / union.size;

    // Fuzzy token matching (handle abbreviations like "Inc" vs "Incorporated")
    let fuzzyMatches = 0;
    const abbreviations: Record<string, string[]> = {
      inc: ["incorporated", "incorporation"],
      corp: ["corporation", "corporate"],
      llc: ["limited", "liability", "company"],
      ave: ["avenue"],
      st: ["street"],
      dr: ["drive"],
      apt: ["apartment"],
    };

    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        const abbrevs1 = abbreviations[token1.toLowerCase()] || [];
        const abbrevs2 = abbreviations[token2.toLowerCase()] || [];

        if (abbrevs1.includes(token2.toLowerCase()) || abbrevs2.includes(token1.toLowerCase())) {
          fuzzyMatches++;
        }
      }
    }

    const fuzzyBonus = (fuzzyMatches / Math.max(tokens1.size, tokens2.size)) * 0.2;
    return Math.min(jaccard + fuzzyBonus, 1.0);
  }

  /**
   * Normalize name for matching (lowercase, remove punctuation, etc.)
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();
  }

  /**
   * Extract identifiers from signal data
   */
  private extractIdentifiers(signal: Signal): Record<string, string> {
    const identifiers: Record<string, string> = {};
    const { data } = signal;

    // Company identifiers
    if (data.ein) identifiers.ein = String(data.ein);
    if (data.duns) identifiers.duns = String(data.duns);
    if (data.secCik) identifiers.secCik = String(data.secCik);

    // Property identifiers
    if (data.apn) identifiers.apn = String(data.apn);
    if (data.parcelId) identifiers.apn = String(data.parcelId);
    if (data.address) identifiers.address = this.normalizeAddress(String(data.address));

    // Person identifiers
    if (data.linkedinUrl) identifiers.linkedinUrl = String(data.linkedinUrl);
    if (data.email) identifiers.email = String(data.email).toLowerCase();

    return identifiers;
  }

  /**
   * Normalize address for matching
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/\b(street|st|avenue|ave|drive|dr|road|rd|apt|apartment|unit)\b/g, (match) => {
        const abbrevs: Record<string, string> = {
          street: "st",
          avenue: "ave",
          drive: "dr",
          road: "rd",
          apartment: "apt",
          unit: "apt",
        };
        return abbrevs[match] || match;
      })
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Add signal to existing entity
   */
  private addSignalToEntity(entityId: string, signal: Signal): Entity {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    entity.signals.push(signal);
    entity.updatedAt = new Date();

    // Update aliases if new name
    const normalizedName = this.normalizeName(signal.entity.name);
    if (!entity.aliases.includes(normalizedName)) {
      entity.aliases.push(normalizedName);
      this.indexAlias(normalizedName, entityId);
    }

    this.emit("entity:updated", {
      entityId,
      signalCount: entity.signals.length,
    });

    return entity;
  }

  /**
   * Create new entity from signal
   */
  private createEntity(signal: Signal): Entity {
    const entityId = `entity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const canonicalName = signal.entity.name;
    const normalizedName = this.normalizeName(canonicalName);
    const identifiers = this.extractIdentifiers(signal);

    const entity: Entity = {
      entityId,
      type: signal.entity.type,
      canonicalName,
      aliases: [normalizedName],
      identifiers,
      signals: [signal],
      confidence: 1.0, // Single source, high confidence
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entities.set(entityId, entity);
    this.indexAlias(normalizedName, entityId);

    // Index identifiers
    for (const [key, value] of Object.entries(identifiers)) {
      this.identifierIndex.set(`${key}:${value}`, entityId);
    }

    this.emit("entity:created", { entityId, type: entity.type });

    return entity;
  }

  /**
   * Index alias for fast lookup
   */
  private indexAlias(alias: string, entityId: string): void {
    if (!this.aliasIndex.has(alias)) {
      this.aliasIndex.set(alias, new Set());
    }
    this.aliasIndex.get(alias)!.add(entityId);
  }

  /**
   * Get entity timeline (all signals sorted by time)
   */
  getEntityTimeline(entityId: string): Signal[] {
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    return entity.signals.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Get entity by ID
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Search entities by name (fuzzy)
   */
  searchEntities(query: string, limit: number = 10): Entity[] {
    const normalizedQuery = this.normalizeName(query);
    const queryTokens = new Set(normalizedQuery.split(/\s+/));

    const matches: Array<{ entity: Entity; score: number }> = [];

    for (const entity of this.entities.values()) {
      for (const alias of entity.aliases) {
        const aliasTokens = new Set(alias.split(/\s+/));
        const score = this.calculateNameSimilarity(queryTokens, aliasTokens);

        if (score >= 0.5) {
          matches.push({ entity, score });
          break; // Only count best alias match
        }
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => m.entity);
  }

  /**
   * Merge two entities (manual override)
   */
  mergeEntities(entityId1: string, entityId2: string): Entity {
    const entity1 = this.entities.get(entityId1);
    const entity2 = this.entities.get(entityId2);

    if (!entity1 || !entity2) {
      throw new Error("Both entities must exist");
    }

    // Merge signals
    entity1.signals.push(...entity2.signals);
    entity1.signals.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Merge aliases
    entity1.aliases.push(...entity2.aliases);
    entity1.aliases = Array.from(new Set(entity1.aliases));

    // Merge identifiers
    entity1.identifiers = { ...entity2.identifiers, ...entity1.identifiers };

    // Update confidence (lower if entities had different identifiers)
    entity1.confidence = Math.min(entity1.confidence, 0.9);
    entity1.updatedAt = new Date();

    // Delete entity2
    this.entities.delete(entityId2);

    // Reindex aliases
    for (const alias of entity2.aliases) {
      const entityIds = this.aliasIndex.get(alias);
      if (entityIds) {
        entityIds.delete(entityId2);
        entityIds.add(entityId1);
      }
    }

    this.emit("entities:merged", {
      survivingEntity: entityId1,
      mergedEntity: entityId2,
    });

    return entity1;
  }

  /**
   * Get resolution statistics
   */
  getStats(): {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    totalSignals: number;
    avgSignalsPerEntity: number;
  } {
    const entitiesByType: Record<string, number> = {};
    let totalSignals = 0;

    for (const entity of this.entities.values()) {
      entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
      totalSignals += entity.signals.length;
    }

    return {
      totalEntities: this.entities.size,
      entitiesByType,
      totalSignals,
      avgSignalsPerEntity:
        this.entities.size > 0 ? totalSignals / this.entities.size : 0,
    };
  }
}
