import {
  Storage,
  Bucket,
  File,
  GetFilesOptions,
} from "@google-cloud/storage";
import { EventEmitter } from "events";

/**
 * Vision Cortex GCS Manager
 * Bi-directional sync, pruning, usage tracking, and intelligent caching
 */
export interface GCSConfig {
  projectId: string;
  bucketName: string;
  credentialsPath?: string;
  compressionThreshold?: number; // bytes, default 1MB
  maxVersions?: number;
  pruneAgeDays?: number;
}

export interface SyncManifest {
  [path: string]: {
    hash: string;
    size: number;
    modified: Date;
    compressed?: boolean;
  };
}

export interface UsageMetrics {
  totalBytes: number;
  objectCount: number;
  topObjects: Array<{ name: string; size: number }>;
  estimatedMonthlyCost: number;
}

export class VisionCortexGCSManager extends EventEmitter {
  private storage: Storage;
  private bucket: Bucket;
  private config: GCSConfig;
  private localManifest: SyncManifest = {};
  private gcsManifest: SyncManifest = {};

  constructor(config: GCSConfig) {
    super();
    this.config = {
      compressionThreshold: 1024 * 1024, // 1MB
      maxVersions: 5,
      pruneAgeDays: 30,
      ...config,
    };

    this.storage = new Storage(this.config as any);

    this.bucket = this.storage.bucket(this.config.bucketName);
  }

  /**
   * Push local files to GCS with deduplication
   */
  async pushToGCS(
    localDir: string,
    exclude: string[] = ["node_modules", ".git", ".env"]
  ): Promise<{ pushed: number; skipped: number; bytes: number }> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const crypto = await import("crypto");

    const result = { pushed: 0, skipped: 0, bytes: 0 };

    const walk = async (dir: string): Promise<string[]> => {
      const files: string[] = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const excluded = exclude.some(
          (ex) => entry.name.includes(ex) || fullPath.includes(ex)
        );

        if (!excluded) {
          if (entry.isDirectory()) {
            files.push(...(await walk(fullPath)));
          } else {
            files.push(fullPath);
          }
        }
      }
      return files;
    };

    const files = await walk(localDir);

    // Build local manifest
    for (const file of files) {
      const data = await fs.readFile(file);
      const hash = crypto.createHash("sha256").update(data).digest("hex");
      const stat = await fs.stat(file);
      const relPath = path.relative(localDir, file);

      this.localManifest[relPath] = {
        hash,
        size: stat.size,
        modified: stat.mtime,
      };
    }

    // Fetch GCS manifest for comparison
    await this.fetchGCSManifest();

    // Push with deduplication
    for (const file of files) {
      const relPath = path.relative(localDir, file);
      const localInfo = this.localManifest[relPath];
      const gcsInfo = this.gcsManifest[relPath];

      // Skip if unchanged (hash match)
      if (gcsInfo && localInfo && gcsInfo.hash === localInfo.hash) {
        result.skipped++;
        this.emit("push:skipped", { file: relPath });
        continue;
      }

      try {
        const data = await fs.readFile(file);
        let uploadData = data;
        let uploadName = relPath;
        let compressed = false;

        // Compress large files
        if (data.length > (this.config.compressionThreshold || 1024 * 1024)) {
          const zlib = await import("zlib");
          uploadData = Buffer.from(await new Promise<any>((resolve, reject) => {
            zlib.gzip(data, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          }));
          uploadName = `${relPath}.gz`;
          compressed = true;
        }

        const file_obj = this.bucket.file(uploadName);
        await file_obj.save(uploadData, {
          metadata: { cacheControl: "public, max-age=3600" },
        });

        result.pushed++;
        result.bytes += uploadData.length;
        this.emit("push:success", { file: relPath, compressed });
      } catch (err) {
        this.emit("push:error", { file: relPath, error: String(err) });
      }
    }

    return result;
  }

  /**
   * Pull files from GCS to local
   */
  async pullFromGCS(
    localDir: string
  ): Promise<{ pulled: number; skipped: number }> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const result = { pulled: 0, skipped: 0 };

    await this.fetchGCSManifest();

    for (const [gcsPath, info] of Object.entries(this.gcsManifest)) {
      const cleanPath = gcsPath.replace(/\.gz$/, "");
      const localPath = path.join(localDir, cleanPath);

      // Create directory
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      // Skip if local is newer
      if (this.localManifest[cleanPath]) {
        const localTime = this.localManifest[cleanPath].modified;
        if (new Date(localTime) > info.modified) {
          result.skipped++;
          this.emit("pull:skipped", { file: gcsPath });
          continue;
        }
      }

      try {
        const file = this.bucket.file(gcsPath);
        const [data] = await file.download();

        // Auto-decompress if gzipped
        if (gcsPath.endsWith(".gz")) {
          const zlib = await import("zlib");
          const decompressed = await new Promise<Buffer>((resolve, reject) => {
            zlib.gunzip(data, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          await fs.writeFile(localPath, decompressed);
        } else {
          await fs.writeFile(localPath, data);
        }

        result.pulled++;
        this.emit("pull:success", { file: gcsPath });
      } catch (err) {
        this.emit("pull:error", { file: gcsPath, error: String(err) });
      }
    }

    return result;
  }

  /**
   * Fetch GCS object manifest
   */
  async fetchGCSManifest(): Promise<SyncManifest> {
    try {
      const [files] = await this.bucket.getFiles({ versions: true });

      this.gcsManifest = {};
      for (const file of files) {
        const metadata = await file.getMetadata();
        this.gcsManifest[file.name] = {
          hash: metadata[0].md5Hash || "",
          size: parseInt(String(metadata[0].size || "0")),
          modified: new Date(metadata[0].updated || ""),
          compressed: file.name.endsWith(".gz"),
        };
      }

      return this.gcsManifest;
    } catch (err) {
      this.emit("manifest:error", { error: String(err) });
      return {};
    }
  }

  /**
   * Prune old versions based on retention policy
   */
  async pruneOldVersions(): Promise<{ deleted: number; freed: number }> {
    const result = { deleted: 0, freed: 0 };

    try {
      const [files] = await this.bucket.getFiles({ versions: true });

      // Group by base name
      const grouped: Record<string, File[]> = {};
      for (const file of files) {
        const baseName = file.name.replace(/#\d+$/, "");
        if (!grouped[baseName]) grouped[baseName] = [];
        grouped[baseName].push(file);
      }

      // Prune each group
      for (const [_baseName, versions] of Object.entries(grouped)) {
        const sorted = versions.sort((a, b) => {
          const aTime = new Date(a.metadata?.updated || 0).getTime();
          const bTime = new Date(b.metadata?.updated || 0).getTime();
          return bTime - aTime;
        });

        for (let i = this.config.maxVersions!; i < sorted.length; i++) {
          const file = sorted[i]; if (!file) continue;
          const age = Math.floor(
            (Date.now() - new Date(file.metadata?.updated || 0).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (age > this.config.pruneAgeDays!) {
            await file.delete();
            result.deleted++;
            result.freed += parseInt(String(file.metadata?.size || "0"));
            this.emit("prune:deleted", {
              file: file.name,
              age,
              size: file.metadata?.size,
            });
          }
        }
      }
    } catch (err) {
      this.emit("prune:error", { error: String(err) });
    }

    return result;
  }

  /**
   * Get usage metrics and cost analysis
   */
  async getUsageMetrics(): Promise<UsageMetrics> {
    try {
      const [files] = await this.bucket.getFiles();

      let totalBytes = 0;
      const topObjects: Array<{ name: string; size: number }> = [];

      for (const file of files) {
        const size = parseInt(String(file.metadata?.size || "0"));
        totalBytes += size;
        topObjects.push({ name: file.name, size });
      }

      topObjects.sort((a, b) => b.size - a.size);

      // Cost calculation (as of Dec 2024)
      const storageGB = totalBytes / (1024 * 1024 * 1024);
      const costPerGBMonth = 0.02;
      const storageCost = storageGB * costPerGBMonth;
      const operationsCost = (files.length * 0.0004) / 1000; // Per 1000 ops
      const estimatedMonthlyCost = storageCost + operationsCost;

      const metrics: UsageMetrics = {
        totalBytes,
        objectCount: files.length,
        topObjects: topObjects.slice(0, 10),
        estimatedMonthlyCost,
      };

      this.emit("usage:calculated", metrics);
      return metrics;
    } catch (err) {
      this.emit("usage:error", { error: String(err) });
      return {
        totalBytes: 0,
        objectCount: 0,
        topObjects: [],
        estimatedMonthlyCost: 0,
      };
    }
  }

  /**
   * Bi-directional sync with conflict resolution
   */
  async bidirectionalSync(
    localDir: string,
    strategy: "local-wins" | "gcs-wins" | "newest-wins" = "newest-wins"
  ): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    const result = { pushed: 0, pulled: 0, conflicts: 0 };

    // Phase 1: Push local changes
    const pushResult = await this.pushToGCS(localDir);
    result.pushed = pushResult.pushed;

    // Phase 2: Pull GCS changes
    const pullResult = await this.pullFromGCS(localDir);
    result.pulled = pullResult.pulled;

    // Phase 3: Detect conflicts
    await this.fetchGCSManifest();
    for (const [path, localInfo] of Object.entries(this.localManifest)) {
      const gcsInfo = this.gcsManifest[path];
      if (gcsInfo && localInfo.hash !== gcsInfo.hash) {
        result.conflicts++;

        // Resolve based on strategy
        if (
          strategy === "local-wins" ||
          (strategy === "newest-wins" && localInfo.modified > gcsInfo.modified)
        ) {
          this.emit("conflict:resolved", {
            file: path,
            resolution: "local-kept",
          });
        } else {
          this.emit("conflict:resolved", {
            file: path,
            resolution: "gcs-kept",
          });
        }
      }
    }

    return result;
  }
}









