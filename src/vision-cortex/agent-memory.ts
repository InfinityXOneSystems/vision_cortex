/**
 * Agent Memory Service - Tracks agent conversations, embeddings, context matching
 * Enables agents to remember prior reasoning and build on consensus
 *
 * Storage: Redis (hot, < 1 day) + AlloyDB/pgvector (warm, 30 days) + GCS (cold, archive)
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../utils/redis-event-bus";
import { Pool } from "pg";

export interface AgentThought {
  thought_id: string;
  agent_id: string;
  timestamp: Date;
  topic: string; // e.g., "market_signal", "deal_strategy", "risk_assessment"
  content: string; // Raw reasoning or conversation
  embedding?: number[]; // Vector embedding (768-dim or 1024-dim from Vertex)
  confidence: number; // 0-1
  metadata: Record<string, unknown>;
}

export interface ConversationThread {
  thread_id: string;
  topic: string;
  participants: string[]; // Agent IDs
  created_at: Date;
  thoughts: AgentThought[];
  consensus?: string; // Final agreed conclusion
  consensus_confidence?: number;
  ttl_seconds?: number; // Redis TTL for hot cache
}

export class AgentMemory extends EventEmitter {
  private eventBus: RedisEventBus;
  private redisClient: any; // Redis client
  private pgPool: Pool; // PostgreSQL + pgvector for embeddings
  private hotCacheTTL = 86400; // 24 hours in Redis

  constructor(
    private config: {
      redisUrl?: string;
      pgHost?: string;
      pgPort?: number;
      pgDatabase?: string;
      pgUser?: string;
      pgPassword?: string;
    } = {}
  ) {
    super();

    this.eventBus = new RedisEventBus({
      redis_url: config.redisUrl || process.env.REDIS_URL,
      service_name: "agent-memory",
    } as any);

    // PostgreSQL connection pool
    this.pgPool = new Pool({
      host: config.pgHost || process.env.PG_HOST || "localhost",
      port: config.pgPort || Number(process.env.PG_PORT) || 5432,
      database: config.pgDatabase || process.env.PG_DATABASE || "vision_cortex",
      user: config.pgUser || process.env.PG_USER || "postgres",
      password: config.pgPassword || process.env.PG_PASSWORD || "postgres",
    });
  }

  /** Initialize connections and create tables */
  async initialize(): Promise<void> {
    await this.eventBus.connect();

    // Create pgvector extension and tables
    await this.pgPool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS agent_thoughts (
        thought_id VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        topic VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding vector(768),
        confidence FLOAT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_topic (topic),
        INDEX idx_agent_timestamp (agent_id, timestamp DESC)
      )
    `);

    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS conversation_threads (
        thread_id VARCHAR(255) PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        participants TEXT[] NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        consensus TEXT,
        consensus_confidence FLOAT,
        ttl_seconds INT,
        INDEX idx_topic_created (topic, created_at DESC)
      )
    `);

    this.emit("memory:initialized");
  }

  /** Store a single agent thought (hot + warm) */
  async storeThought(thought: AgentThought): Promise<void> {
    // Hot: Redis (24h TTL)
    const redisKey = `thought:${thought.thought_id}`;
    await this.redisClient.setex(
      redisKey,
      thought.ttl_seconds || this.hotCacheTTL,
      JSON.stringify(thought)
    );

    // Warm: PostgreSQL with vector embedding
    await this.pgPool.query(
      `INSERT INTO agent_thoughts
        (thought_id, agent_id, timestamp, topic, content, embedding, confidence, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (thought_id) DO UPDATE SET updated_at = NOW()`,
      [
        thought.thought_id,
        thought.agent_id,
        thought.timestamp,
        thought.topic,
        thought.content,
        thought.embedding ? JSON.stringify(thought.embedding) : null,
        thought.confidence,
        JSON.stringify(thought.metadata || {}),
      ]
    );

    this.emit("thought:stored", { thought_id: thought.thought_id });
  }

  /** Retrieve similar thoughts (vector search in pgvector) */
  async searchSimilarThoughts(
    embedding: number[],
    topic?: string,
    limit = 5
  ): Promise<AgentThought[]> {
    let query =
      "SELECT * FROM agent_thoughts WHERE embedding IS NOT NULL ORDER BY embedding <-> $1 LIMIT $2";
    const params: any[] = [JSON.stringify(embedding), limit];

    if (topic) {
      query =
        "SELECT * FROM agent_thoughts WHERE topic = $2 AND embedding IS NOT NULL ORDER BY embedding <-> $1 LIMIT $3";
      params.splice(1, 0, topic);
      params.push(limit);
    }

    const result = await this.pgPool.query(query, params);
    return result.rows.map((row: any) => ({
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata || {},
    }));
  }

  /** Start or retrieve a conversation thread */
  async getOrCreateThread(
    thread_id: string,
    topic: string,
    participants: string[]
  ): Promise<ConversationThread> {
    // Check hot cache first
    const cachedThread = await this.redisClient.get(`thread:${thread_id}`);
    if (cachedThread) {
      return JSON.parse(cachedThread);
    }

    // Check warm storage
    const result = await this.pgPool.query(
      "SELECT * FROM conversation_threads WHERE thread_id = $1",
      [thread_id]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const thread: ConversationThread = {
        thread_id: row.thread_id,
        topic: row.topic,
        participants: row.participants,
        created_at: row.created_at,
        thoughts: [],
        consensus: row.consensus,
        consensus_confidence: row.consensus_confidence,
      };
      return thread;
    }

    // Create new thread
    const newThread: ConversationThread = {
      thread_id,
      topic,
      participants,
      created_at: new Date(),
      thoughts: [],
      ttl_seconds: this.hotCacheTTL,
    };

    await this.pgPool.query(
      `INSERT INTO conversation_threads
        (thread_id, topic, participants, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [thread_id, topic, JSON.stringify(participants)]
    );

    return newThread;
  }

  /** Add a thought to a conversation thread */
  async addThoughtToThread(
    thread_id: string,
    thought: AgentThought
  ): Promise<void> {
    // Store thought
    await this.storeThought(thought);

    // Link to thread (in PostgreSQL)
    await this.pgPool.query(
      `UPDATE conversation_threads SET updated_at = NOW() WHERE thread_id = $1`,
      [thread_id]
    );

    // Invalidate hot cache
    await this.redisClient.del(`thread:${thread_id}`);

    this.emit("thought:added-to-thread", {
      thread_id,
      thought_id: thought.thought_id,
      agent_id: thought.agent_id,
    });
  }

  /** Retrieve full conversation thread with all thoughts */
  async getThread(thread_id: string): Promise<ConversationThread | null> {
    const result = await this.pgPool.query(
      "SELECT * FROM conversation_threads WHERE thread_id = $1",
      [thread_id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Fetch all thoughts for this thread
    const thoughtsResult = await this.pgPool.query(
      "SELECT * FROM agent_thoughts WHERE thought_id IN (SELECT thought_id FROM agent_thoughts WHERE metadata->>'thread_id' = $1) ORDER BY timestamp ASC",
      [thread_id]
    );

    return {
      thread_id: row.thread_id,
      topic: row.topic,
      participants: row.participants,
      created_at: row.created_at,
      thoughts: thoughtsResult.rows.map((t: any) => ({
        ...t,
        embedding: t.embedding ? JSON.parse(t.embedding) : undefined,
        metadata: t.metadata || {},
      })),
      consensus: row.consensus,
      consensus_confidence: row.consensus_confidence,
    };
  }

  /** Store consensus for a thread */
  async storeConsensus(
    thread_id: string,
    consensus: string,
    confidence: number
  ): Promise<void> {
    await this.pgPool.query(
      `UPDATE conversation_threads SET consensus = $1, consensus_confidence = $2, updated_at = NOW() WHERE thread_id = $3`,
      [consensus, confidence, thread_id]
    );

    this.emit("consensus:stored", { thread_id, confidence });
  }

  /** Retrieve thoughts by topic (for agent context awareness) */
  async getThreadsByTopic(topic: string, limit = 10): Promise<ConversationThread[]> {
    const result = await this.pgPool.query(
      "SELECT * FROM conversation_threads WHERE topic = $1 ORDER BY updated_at DESC LIMIT $2",
      [topic, limit]
    );

    return Promise.all(
      result.rows.map((row: any) =>
        this.getThread(row.thread_id)
      )
    ).then((threads) => threads.filter((t) => t !== null) as ConversationThread[]);
  }

  /** Clean up old threads (lifecycle) */
  async pruneOldThreads(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.pgPool.query(
      "DELETE FROM conversation_threads WHERE created_at < $1",
      [cutoffDate]
    );

    this.emit("threads:pruned", { count: result.rowCount, days_old: daysOld });
    return result.rowCount || 0;
  }

  /** Shutdown connections */
  async shutdown(): Promise<void> {
    await this.eventBus.disconnect();
    await this.pgPool.end();
    this.emit("memory:shutdown");
  }
}

// Standalone execution
if (require.main === module) {
  const memory = new AgentMemory();
  void memory.initialize().then(() => {
    console.log("Agent Memory Service initialized");
  });
}
