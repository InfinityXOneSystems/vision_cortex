# Google Cloud Storage (GCS) Bucket Configuration
# Vision Cortex bi-directional sync with pruning and usage optimization

# Bucket name (globally unique)
resource "google_storage_bucket" "vision_cortex" {
  name          = "vision-cortex-infinity-x-one"
  location      = "US"
  force_destroy = false

  # Versioning for recovery (keep last 5 versions)
  versioning {
    enabled = true
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    # Delete old versions after 30 days
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 5
      days_since_noncurrent_time = 30
    }
  }

  # Auto-delete incomplete multipart uploads after 7 days
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 7
      matches_storage_class = ["STANDARD"]
    }
  }

  # Transition to Cold Storage after 90 days (for archive signals)
  lifecycle_rule {
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }

  # Enable uniform bucket-level access (recommended security)
  uniform_bucket_level_access = true

  # Enable Requester Pays (optional: downstream services pay for egress)
  requester_pays = false

  # Labels for cost tracking and governance
  labels = {
    team        = "vision-cortex"
    environment = "production"
    project     = "infinity-x-one-systems"
    cost-center = "intelligence"
  }
}

# Service account for Vision Cortex app (read/write access)
resource "google_service_account" "vision_cortex_app" {
  account_id   = "vision-cortex-app"
  display_name = "Vision Cortex Application"
}

# Binding: Service account can read/write bucket
resource "google_storage_bucket_iam_binding" "vision_cortex_access" {
  bucket = google_storage_bucket.vision_cortex.name
  role   = "roles/storage.objectAdmin"

  members = [
    "serviceAccount:${google_service_account.vision_cortex_app.email}"
  ]
}

# Service account for sync operations (higher permissions)
resource "google_service_account" "sync_service" {
  account_id   = "vision-cortex-sync"
  display_name = "Vision Cortex Sync Service"
}

# Binding: Sync service can manage the bucket
resource "google_storage_bucket_iam_binding" "sync_access" {
  bucket = google_storage_bucket.vision_cortex.name
  role   = "roles/storage.admin"

  members = [
    "serviceAccount:${google_service_account.sync_service.email}"
  ]
}

# Output bucket name for scripts
output "bucket_name" {
  value       = google_storage_bucket.vision_cortex.name
  description = "Vision Cortex GCS bucket name"
}

output "bucket_url" {
  value       = "gs://${google_storage_bucket.vision_cortex.name}"
  description = "Vision Cortex GCS bucket URL"
}

output "service_account_email" {
  value       = google_service_account.vision_cortex_app.email
  description = "Service account email for app access"
}
