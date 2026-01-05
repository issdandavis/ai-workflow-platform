/**
 * Vector Memory Service v1.0
 * 
 * Stores and retrieves embeddings for architectural consistency.
 * When the AI finishes a task, it generates a summary embedding and stores it.
 * Future tasks search this memory to maintain consistent patterns.
 * 
 * @version 1.0.0
 * @storage Supabase with pgvector extension
 */

import { storage } from "../storage";
import { getProviderAdapter } from "./providerAdapters";

export interface MemoryEntry {
  id: string;
  taskId: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface SearchResult {
  entry: MemoryEntry;
  similarity: number;
}

/**
 * Vector Memory Manager
 * Handles embedding generation and similarity search
 */
export class VectorMemoryService {
  private embeddingModel = "text-embedding-3-small";
  private embeddingDimension = 1536;

  /**
   * Store a memory entry with embedding
   */
  async store(
    taskId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<MemoryEntry> {
    // Generate embedding
    const embedding = await this.generateEmbedding(content);

    // Store in database
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      content,
      embedding,
      metadata: {
        ...metadata,
        embeddingModel: this.embeddingModel,
        contentLength: content.length,
      },
      createdAt: new Date(),
    };

    // Store as memory item
    try {
      await storage.createMemoryItem?.({
        projectId: metadata.projectId || "system",
        kind: "vector_memory",
        source: "ai_development_engine",
        content: JSON.stringify({
          taskId,
          content: content.substring(0, 5000), // Truncate for storage
          metadata,
        }),
        embeddingRef: entry.id,
      });
    } catch (error) {
      console.error("[VectorMemory] Storage error:", error);
    }

    return entry;
  }

  /**
   * Search for similar memories
   */
  async search(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // For now, return recent memory items (full vector search requires pgvector)
      const recentItems = await storage.getRecentMemoryItems?.(limit * 2) || [];

      // Filter and score by simple text similarity (placeholder for vector search)
      const results: SearchResult[] = recentItems
        .filter((item: any) => item.kind === "vector_memory")
        .map((item: any) => {
          const parsed = JSON.parse(item.content);
          const similarity = this.textSimilarity(query, parsed.content || "");
          return {
            entry: {
              id: item.id,
              taskId: parsed.taskId,
              content: parsed.content,
              metadata: parsed.metadata,
              createdAt: item.createdAt,
            },
            similarity,
          };
        })
        .filter((r: SearchResult) => r.similarity >= threshold)
        .sort((a: SearchResult, b: SearchResult) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error("[VectorMemory] Search error:", error);
      return [];
    }
  }

  /**
   * Get context for a task based on similar past tasks
   */
  async getTaskContext(description: string): Promise<string> {
    const results = await this.search(description, 3, 0.5);

    if (results.length === 0) {
      return "No relevant previous context found.";
    }

    return results
      .map((r, i) => `[Context ${i + 1}] (similarity: ${(r.similarity * 100).toFixed(1)}%)\n${r.entry.content.substring(0, 500)}...`)
      .join("\n\n");
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const adapter = getProviderAdapter("openai");
      
      // Use OpenAI embeddings API
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text.substring(0, 8000), // Token limit
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("[VectorMemory] Embedding error:", error);
      // Return zero vector as fallback
      return new Array(this.embeddingDimension).fill(0);
    }
  }

  /**
   * Simple text similarity (Jaccard-like) as fallback
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const vectorMemory = new VectorMemoryService();
