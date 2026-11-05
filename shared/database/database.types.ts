// Generated from local migrations. Run npm run db:types; do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_deletions": {
                  Row: {
                    "completed_at": string | null,"id": string,"owner_id": string | null,"requested_at": string,"safe_error_code": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"id"?: string,"owner_id"?: string | null,"requested_at"?: string,"safe_error_code"?: string | null,"status"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"id"?: string,"owner_id"?: string | null,"requested_at"?: string,"safe_error_code"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_deletions_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"action_grants": {
                  Row: {
                    "action": string,"consumed_at": string | null,"created_at": string,"expires_at": string,"id": string,"method": string,"oauth_flow_id": string | null,"owner_id": string,"session_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"consumed_at"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"method": string,"oauth_flow_id"?: string | null,"owner_id": string,"session_id": string,"token_hash": string
                  }
                  Update: {
                    "action"?: string,"consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"method"?: string,"oauth_flow_id"?: string | null,"owner_id"?: string,"session_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "action_grants_oauth_flow_id_owner_id_session_id_action_fkey"
      columns: ["oauth_flow_id","owner_id","session_id","action"]
isOneToOne: false
      referencedRelation: "oauth_flows"
      referencedColumns: ["id","owner_id","initiating_session_id","action"]
    },{
      foreignKeyName: "action_grants_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "claims_paused": boolean,"generation_paused": boolean,"id": string,"limits": NonNullable<Json>,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "claims_paused"?: boolean,"generation_paused"?: boolean,"id": string,"limits"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "claims_paused"?: boolean,"generation_paused"?: boolean,"id"?: string,"limits"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"assets": {
                  Row: {
                    "bucket": string,"byte_size": number | null,"checksum": string | null,"client_artifact_key": string | null,"created_at": string,"creator_job_id": string | null,"declared_bytes": number | null,"declared_mime": string | null,"deleted_at": string | null,"detected_mime": string | null,"duration_ms": number | null,"expires_at": string | null,"height": number | null,"id": string,"kind": string,"object_key": string,"original_filename": string | null,"owner_id": string,"producing_lease_token": number | null,"project_id": string,"provider_metadata": NonNullable<Json>,"published_at": string | null,"received_at": string | null,"safe_error_code": string | null,"safe_message": string | null,"state": string,"updated_at": string,"validated_at": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"byte_size"?: number | null,"checksum"?: string | null,"client_artifact_key"?: string | null,"created_at"?: string,"creator_job_id"?: string | null,"declared_bytes"?: number | null,"declared_mime"?: string | null,"deleted_at"?: string | null,"detected_mime"?: string | null,"duration_ms"?: number | null,"expires_at"?: string | null,"height"?: number | null,"id"?: string,"kind": string,"object_key": string,"original_filename"?: string | null,"owner_id": string,"producing_lease_token"?: number | null,"project_id": string,"provider_metadata"?: NonNullable<Json>,"published_at"?: string | null,"received_at"?: string | null,"safe_error_code"?: string | null,"safe_message"?: string | null,"state"?: string,"updated_at"?: string,"validated_at"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"byte_size"?: number | null,"checksum"?: string | null,"client_artifact_key"?: string | null,"created_at"?: string,"creator_job_id"?: string | null,"declared_bytes"?: number | null,"declared_mime"?: string | null,"deleted_at"?: string | null,"detected_mime"?: string | null,"duration_ms"?: number | null,"expires_at"?: string | null,"height"?: number | null,"id"?: string,"kind"?: string,"object_key"?: string,"original_filename"?: string | null,"owner_id"?: string,"producing_lease_token"?: number | null,"project_id"?: string,"provider_metadata"?: NonNullable<Json>,"published_at"?: string | null,"received_at"?: string | null,"safe_error_code"?: string | null,"safe_message"?: string | null,"state"?: string,"updated_at"?: string,"validated_at"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assets_creator_job_id_producing_lease_token_fkey"
      columns: ["creator_job_id","producing_lease_token"]
isOneToOne: false
      referencedRelation: "job_runs"
      referencedColumns: ["job_id","lease_token"]
    },{
      foreignKeyName: "assets_creator_job_id_project_id_owner_id_fkey"
      columns: ["creator_job_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "assets_creator_job_id_project_id_owner_id_fkey"
      columns: ["creator_job_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "assets_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"checkpoint_assets": {
                  Row: {
                    "asset_id": string,"checkpoint_id": string,"created_at": string,"dependency_hash": string,"job_id": string,"owner_id": string,"project_id": string,"revision_id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"checkpoint_id": string,"created_at"?: string,"dependency_hash": string,"job_id": string,"owner_id": string,"project_id": string,"revision_id": string,"role": string
                  }
                  Update: {
                    "asset_id"?: string,"checkpoint_id"?: string,"created_at"?: string,"dependency_hash"?: string,"job_id"?: string,"owner_id"?: string,"project_id"?: string,"revision_id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkpoint_assets_asset_id_project_id_owner_id_fkey"
      columns: ["asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "checkpoint_assets_checkpoint_id_job_id_revision_id_project_fkey"
      columns: ["checkpoint_id","job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "checkpoints"
      referencedColumns: ["id","job_id","revision_id","project_id","owner_id"]
    }
                  ]
                },"checkpoints": {
                  Row: {
                    "created_at": string,"dependency_hash": string,"id": string,"job_id": string,"manifest": NonNullable<Json>,"owner_id": string,"producer_version": string,"producing_lease_token": number,"project_id": string,"revision_id": string,"source_checkpoint_id": string | null,"stage": string,"state": string,"unit_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dependency_hash": string,"id"?: string,"job_id": string,"manifest"?: NonNullable<Json>,"owner_id": string,"producer_version": string,"producing_lease_token": number,"project_id": string,"revision_id": string,"source_checkpoint_id"?: string | null,"stage": string,"state"?: string,"unit_key": string
                  }
                  Update: {
                    "created_at"?: string,"dependency_hash"?: string,"id"?: string,"job_id"?: string,"manifest"?: NonNullable<Json>,"owner_id"?: string,"producer_version"?: string,"producing_lease_token"?: number,"project_id"?: string,"revision_id"?: string,"source_checkpoint_id"?: string | null,"stage"?: string,"state"?: string,"unit_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkpoints_job_id_producing_lease_token_fkey"
      columns: ["job_id","producing_lease_token"]
isOneToOne: false
      referencedRelation: "job_runs"
      referencedColumns: ["job_id","lease_token"]
    },{
      foreignKeyName: "checkpoints_job_id_revision_id_project_id_owner_id_fkey"
      columns: ["job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "checkpoints_job_id_revision_id_project_id_owner_id_fkey"
      columns: ["job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "checkpoints_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkpoints_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "checkpoints_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "checkpoints_source_checkpoint_id_project_id_owner_id_fkey"
      columns: ["source_checkpoint_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "checkpoints"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                },"cleanup_tasks": {
                  Row: {
                    "asset_id": string | null,"attempt_count": number,"bucket": string,"completed_at": string | null,"created_at": string,"id": string,"lease_expires_at": string | null,"lease_token": number,"next_attempt_at": string,"object_key": string,"owner_id": string | null,"reason": string,"safe_error_code": string | null,"state": string,"updated_at": string,"worker_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id"?: string | null,"attempt_count"?: number,"bucket": string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"lease_expires_at"?: string | null,"lease_token"?: number,"next_attempt_at"?: string,"object_key": string,"owner_id"?: string | null,"reason": string,"safe_error_code"?: string | null,"state"?: string,"updated_at"?: string,"worker_id"?: string | null
                  }
                  Update: {
                    "asset_id"?: string | null,"attempt_count"?: number,"bucket"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"lease_expires_at"?: string | null,"lease_token"?: number,"next_attempt_at"?: string,"object_key"?: string,"owner_id"?: string | null,"reason"?: string,"safe_error_code"?: string | null,"state"?: string,"updated_at"?: string,"worker_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cleanup_tasks_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cleanup_tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cleanup_tasks_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"exports": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"job_id": string,"owner_id": string,"project_id": string,"ready_at": string | null,"revision_id": string,"srt_asset_id": string | null,"state": string,"thumbnail_asset_id": string | null,"updated_at": string,"variant": string,"verification_asset_id": string | null,"video_asset_id": string | null,"vtt_asset_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"job_id": string,"owner_id": string,"project_id": string,"ready_at"?: string | null,"revision_id": string,"srt_asset_id"?: string | null,"state"?: string,"thumbnail_asset_id"?: string | null,"updated_at"?: string,"variant": string,"verification_asset_id"?: string | null,"video_asset_id"?: string | null,"vtt_asset_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"job_id"?: string,"owner_id"?: string,"project_id"?: string,"ready_at"?: string | null,"revision_id"?: string,"srt_asset_id"?: string | null,"state"?: string,"thumbnail_asset_id"?: string | null,"updated_at"?: string,"variant"?: string,"verification_asset_id"?: string | null,"video_asset_id"?: string | null,"vtt_asset_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exports_job_id_revision_id_project_id_owner_id_fkey"
      columns: ["job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_job_id_revision_id_project_id_owner_id_fkey"
      columns: ["job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exports_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "exports_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_srt_asset_id_project_id_owner_id_fkey"
      columns: ["srt_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_thumbnail_asset_id_project_id_owner_id_fkey"
      columns: ["thumbnail_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_verification_asset_id_project_id_owner_id_fkey"
      columns: ["verification_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_video_asset_id_project_id_owner_id_fkey"
      columns: ["video_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "exports_vtt_asset_id_project_id_owner_id_fkey"
      columns: ["vtt_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                },"idempotency_requests": {
                  Row: {
                    "created_at": string,"id": string,"key": string,"operation": string,"owner_id": string,"request_hash": string,"resource_id": string,"resource_type": string,"response_status": number,"safe_response": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key": string,"operation": string,"owner_id": string,"request_hash": string,"resource_id": string,"resource_type": string,"response_status": number,"safe_response"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key"?: string,"operation"?: string,"owner_id"?: string,"request_hash"?: string,"resource_id"?: string,"resource_type"?: string,"response_status"?: number,"safe_response"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "idempotency_requests_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"job_events": {
                  Row: {
                    "code": string,"created_at": string,"details": NonNullable<Json>,"event_key": string | null,"job_id": string,"run_id": string | null,"safe_message": string,"sequence": number,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"details"?: NonNullable<Json>,"event_key"?: string | null,"job_id": string,"run_id"?: string | null,"safe_message": string,"sequence": number,"stage": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"event_key"?: string | null,"job_id"?: string,"run_id"?: string | null,"safe_message"?: string,"sequence"?: number,"stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_events_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_events_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_events_run_id_job_id_fkey"
      columns: ["run_id","job_id"]
isOneToOne: false
      referencedRelation: "job_runs"
      referencedColumns: ["id","job_id"]
    }
                  ]
                },"job_repairs": {
                  Row: {
                    "created_at": string,"id": string,"job_id": string,"lease_token": number,"reason_code": string,"repair_key": string,"stage": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"job_id": string,"lease_token": number,"reason_code": string,"repair_key": string,"stage": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"job_id"?: string,"lease_token"?: number,"reason_code"?: string,"repair_key"?: string,"stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_repairs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_repairs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"job_runs": {
                  Row: {
                    "active_ms": number,"attempt_number": number,"ended_at": string | null,"id": string,"job_id": string,"lease_token": number,"outcome": string,"started_at": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_ms"?: number,"attempt_number": number,"ended_at"?: string | null,"id"?: string,"job_id": string,"lease_token": number,"outcome"?: string,"started_at"?: string,"worker_id": string
                  }
                  Update: {
                    "active_ms"?: number,"attempt_number"?: number,"ended_at"?: string | null,"id"?: string,"job_id"?: string,"lease_token"?: number,"outcome"?: string,"started_at"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_runs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_runs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_runs_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"job_terminal_operations": {
                  Row: {
                    "created_at": string,"id": string,"job_id": string,"kind": string,"operation_key": string,"request_hash": string,"safe_result": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"job_id": string,"kind": string,"operation_key": string,"request_hash": string,"safe_result"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"job_id"?: string,"kind"?: string,"operation_key"?: string,"request_hash"?: string,"safe_result"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_terminal_operations_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_terminal_operations_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "active_ms": number,"attempt_count": number,"available_at": string,"budget_snapshot": NonNullable<Json>,"cancel_requested_at": string | null,"completion_key": string | null,"completion_manifest_hash": string | null,"created_at": string,"event_sequence": number,"export_id": string | null,"finished_at": string | null,"id": string,"kind": string,"last_failure_key": string | null,"last_heartbeat_at": string | null,"lease_expires_at": string | null,"lease_token": number,"owner_id": string,"progress": NonNullable<Json>,"project_id": string,"protocol_version": number,"provider_attempt_count": number,"repair_count": number,"retry_at": string | null,"revision_id": string,"safe_error_code": string | null,"safe_message": string | null,"stage": string,"started_at": string | null,"status": string,"updated_at": string,"worker_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active_ms"?: number,"attempt_count"?: number,"available_at"?: string,"budget_snapshot"?: NonNullable<Json>,"cancel_requested_at"?: string | null,"completion_key"?: string | null,"completion_manifest_hash"?: string | null,"created_at"?: string,"event_sequence"?: number,"export_id"?: string | null,"finished_at"?: string | null,"id"?: string,"kind": string,"last_failure_key"?: string | null,"last_heartbeat_at"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: number,"owner_id": string,"progress"?: NonNullable<Json>,"project_id": string,"protocol_version"?: number,"provider_attempt_count"?: number,"repair_count"?: number,"retry_at"?: string | null,"revision_id": string,"safe_error_code"?: string | null,"safe_message"?: string | null,"stage"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"worker_id"?: string | null
                  }
                  Update: {
                    "active_ms"?: number,"attempt_count"?: number,"available_at"?: string,"budget_snapshot"?: NonNullable<Json>,"cancel_requested_at"?: string | null,"completion_key"?: string | null,"completion_manifest_hash"?: string | null,"created_at"?: string,"event_sequence"?: number,"export_id"?: string | null,"finished_at"?: string | null,"id"?: string,"kind"?: string,"last_failure_key"?: string | null,"last_heartbeat_at"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: number,"owner_id"?: string,"progress"?: NonNullable<Json>,"project_id"?: string,"protocol_version"?: number,"provider_attempt_count"?: number,"repair_count"?: number,"retry_at"?: string | null,"revision_id"?: string,"safe_error_code"?: string | null,"safe_message"?: string | null,"stage"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"worker_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_export_fk"
      columns: ["export_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "exports"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "jobs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "jobs_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "jobs_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"oauth_flows": {
                  Row: {
                    "action": string | null,"completed_at": string | null,"created_at": string,"expected_identity_id": string | null,"expires_at": string,"flow_kind": string,"id": string,"initiating_session_id": string | null,"owner_id": string | null,"provider": string,"return_path": string,"state_hash": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action"?: string | null,"completed_at"?: string | null,"created_at"?: string,"expected_identity_id"?: string | null,"expires_at": string,"flow_kind": string,"id"?: string,"initiating_session_id"?: string | null,"owner_id"?: string | null,"provider": string,"return_path": string,"state_hash": string,"status"?: string
                  }
                  Update: {
                    "action"?: string | null,"completed_at"?: string | null,"created_at"?: string,"expected_identity_id"?: string | null,"expires_at"?: string,"flow_kind"?: string,"id"?: string,"initiating_session_id"?: string | null,"owner_id"?: string | null,"provider"?: string,"return_path"?: string,"state_hash"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "oauth_flows_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"operator_audit": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"resource_id": string | null,"resource_type": string,"safe_metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"resource_id"?: string | null,"resource_type": string,"safe_metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"resource_id"?: string | null,"resource_type"?: string,"safe_metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "operator_audit_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_versions": {
                  Row: {
                    "created_at": string,"created_by_job_id": string,"dependency_hash": string,"id": string,"model_id": string,"owner_id": string,"project_id": string,"prompt_version": string,"revision_id": string,"source_inventory": NonNullable<Json>,"status": string,"validation_summary": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by_job_id": string,"dependency_hash": string,"id"?: string,"model_id": string,"owner_id": string,"project_id": string,"prompt_version": string,"revision_id": string,"source_inventory"?: NonNullable<Json>,"status": string,"validation_summary"?: NonNullable<Json>,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by_job_id"?: string,"dependency_hash"?: string,"id"?: string,"model_id"?: string,"owner_id"?: string,"project_id"?: string,"prompt_version"?: string,"revision_id"?: string,"source_inventory"?: NonNullable<Json>,"status"?: string,"validation_summary"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_versions_created_by_job_id_revision_id_project_id_own_fkey"
      columns: ["created_by_job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "plan_versions_created_by_job_id_revision_id_project_id_own_fkey"
      columns: ["created_by_job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "plan_versions_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_versions_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "plan_versions_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"defaults": NonNullable<Json>,"deletion_requested_at": string | null,"display_name": string,"email_ownership": string,"email_ownership_identity_id": string | null,"id": string,"role": string,"settings_version": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"defaults"?: NonNullable<Json>,"deletion_requested_at"?: string | null,"display_name": string,"email_ownership"?: string,"email_ownership_identity_id"?: string | null,"id"?: string,"role"?: string,"settings_version"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"defaults"?: NonNullable<Json>,"deletion_requested_at"?: string | null,"display_name"?: string,"email_ownership"?: string,"email_ownership_identity_id"?: string | null,"id"?: string,"role"?: string,"settings_version"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"draft_input": NonNullable<Json>,"draft_state": string,"draft_version": number,"id": string,"latest_ready_revision_id": string | null,"mode": string,"next_revision_number": number,"owner_id": string,"preferences": NonNullable<Json>,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"draft_input"?: NonNullable<Json>,"draft_state"?: string,"draft_version"?: number,"id"?: string,"latest_ready_revision_id"?: string | null,"mode": string,"next_revision_number"?: number,"owner_id": string,"preferences"?: NonNullable<Json>,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"draft_input"?: NonNullable<Json>,"draft_state"?: string,"draft_version"?: number,"id"?: string,"latest_ready_revision_id"?: string | null,"mode"?: string,"next_revision_number"?: number,"owner_id"?: string,"preferences"?: NonNullable<Json>,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_latest_revision_fk"
      columns: ["latest_ready_revision_id","id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "projects_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_attempts": {
                  Row: {
                    "dispatch_nonce": string,"finished_at": string | null,"id": string,"job_id": string,"model_id": string,"operation_attempt": number,"operation_key": string,"provider": string,"provider_request_id": string | null,"request_hash": string,"run_id": string,"safe_error_code": string | null,"started_at": string,"status": string,"usage": Json | null,"voice_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "dispatch_nonce": string,"finished_at"?: string | null,"id"?: string,"job_id": string,"model_id": string,"operation_attempt": number,"operation_key": string,"provider": string,"provider_request_id"?: string | null,"request_hash": string,"run_id": string,"safe_error_code"?: string | null,"started_at"?: string,"status": string,"usage"?: Json | null,"voice_id"?: string | null
                  }
                  Update: {
                    "dispatch_nonce"?: string,"finished_at"?: string | null,"id"?: string,"job_id"?: string,"model_id"?: string,"operation_attempt"?: number,"operation_key"?: string,"provider"?: string,"provider_request_id"?: string | null,"request_hash"?: string,"run_id"?: string,"safe_error_code"?: string | null,"started_at"?: string,"status"?: string,"usage"?: Json | null,"voice_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_attempts_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_attempts_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_attempts_run_id_job_id_fkey"
      columns: ["run_id","job_id"]
isOneToOne: false
      referencedRelation: "job_runs"
      referencedColumns: ["id","job_id"]
    }
                  ]
                },"provider_health": {
                  Row: {
                    "model_id": string,"observed_at": string,"provider": string,"retry_at": string | null,"safe_reason": string | null,"state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "model_id": string,"observed_at"?: string,"provider": string,"retry_at"?: string | null,"safe_reason"?: string | null,"state": string
                  }
                  Update: {
                    "model_id"?: string,"observed_at"?: string,"provider"?: string,"retry_at"?: string | null,"safe_reason"?: string | null,"state"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limit_windows": {
                  Row: {
                    "action": string,"count": number,"expires_at": string,"scope_hash": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"count": number,"expires_at": string,"scope_hash": string,"window_start": string
                  }
                  Update: {
                    "action"?: string,"count"?: number,"expires_at"?: string,"scope_hash"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"revision_assets": {
                  Row: {
                    "asset_id": string,"created_at": string,"owner_id": string,"project_id": string,"purpose": string,"retain_until": string,"revision_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"created_at"?: string,"owner_id": string,"project_id": string,"purpose": string,"retain_until": string,"revision_id": string
                  }
                  Update: {
                    "asset_id"?: string,"created_at"?: string,"owner_id"?: string,"project_id"?: string,"purpose"?: string,"retain_until"?: string,"revision_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "revision_assets_asset_id_project_id_owner_id_fkey"
      columns: ["asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "revision_assets_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                },"revisions": {
                  Row: {
                    "completed_at": string | null,"composition_version": string,"created_at": string,"deleted_at": string | null,"expires_at": string | null,"id": string,"input_hash": string,"input_snapshot": NonNullable<Json>,"instruction": string | null,"orientation": string,"owner_id": string,"parent_revision_id": string | null,"project_id": string,"prompt_version": string,"request_kind": string,"revision_number": number,"schema_version": number,"selected_plan_id": string | null,"status": string,"target_seconds": number,"updated_at": string,"voice_profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"composition_version": string,"created_at"?: string,"deleted_at"?: string | null,"expires_at"?: string | null,"id"?: string,"input_hash": string,"input_snapshot"?: NonNullable<Json>,"instruction"?: string | null,"orientation": string,"owner_id": string,"parent_revision_id"?: string | null,"project_id": string,"prompt_version": string,"request_kind": string,"revision_number": number,"schema_version": number,"selected_plan_id"?: string | null,"status"?: string,"target_seconds": number,"updated_at"?: string,"voice_profile_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"composition_version"?: string,"created_at"?: string,"deleted_at"?: string | null,"expires_at"?: string | null,"id"?: string,"input_hash"?: string,"input_snapshot"?: NonNullable<Json>,"instruction"?: string | null,"orientation"?: string,"owner_id"?: string,"parent_revision_id"?: string | null,"project_id"?: string,"prompt_version"?: string,"request_kind"?: string,"revision_number"?: number,"schema_version"?: number,"selected_plan_id"?: string | null,"status"?: string,"target_seconds"?: number,"updated_at"?: string,"voice_profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "revisions_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revisions_parent_revision_id_project_id_owner_id_fkey"
      columns: ["parent_revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "revisions_plan_fk"
      columns: ["selected_plan_id","id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "plan_versions"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "revisions_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"scene_timings": {
                  Row: {
                    "audio_asset_id": string,"captions_asset_id": string,"checkpoint_id": string,"duration_frames": number,"job_id": string,"measured_audio_ms": number,"mouth_cues_asset_id": string | null,"owner_id": string,"plan_id": string,"project_id": string,"revision_id": string,"scene_id": string,"start_frame": number
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_asset_id": string,"captions_asset_id": string,"checkpoint_id": string,"duration_frames": number,"job_id": string,"measured_audio_ms": number,"mouth_cues_asset_id"?: string | null,"owner_id": string,"plan_id": string,"project_id": string,"revision_id": string,"scene_id": string,"start_frame": number
                  }
                  Update: {
                    "audio_asset_id"?: string,"captions_asset_id"?: string,"checkpoint_id"?: string,"duration_frames"?: number,"job_id"?: string,"measured_audio_ms"?: number,"mouth_cues_asset_id"?: string | null,"owner_id"?: string,"plan_id"?: string,"project_id"?: string,"revision_id"?: string,"scene_id"?: string,"start_frame"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "scene_timings_audio_asset_id_project_id_owner_id_fkey"
      columns: ["audio_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "scene_timings_captions_asset_id_project_id_owner_id_fkey"
      columns: ["captions_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "scene_timings_checkpoint_id_job_id_revision_id_project_id__fkey"
      columns: ["checkpoint_id","job_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "checkpoints"
      referencedColumns: ["id","job_id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "scene_timings_mouth_cues_asset_id_project_id_owner_id_fkey"
      columns: ["mouth_cues_asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "scene_timings_scene_id_plan_id_revision_id_project_id_owne_fkey"
      columns: ["scene_id","plan_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "scenes"
      referencedColumns: ["id","plan_id","revision_id","project_id","owner_id"]
    }
                  ]
                },"scenes": {
                  Row: {
                    "created_at": string,"evidence": NonNullable<Json>,"id": string,"narration": string,"ordinal": number,"owner_id": string,"plan_id": string,"project_id": string,"revision_id": string,"script_hash": string,"visual": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence"?: NonNullable<Json>,"id"?: string,"narration": string,"ordinal": number,"owner_id": string,"plan_id": string,"project_id": string,"revision_id": string,"script_hash": string,"visual"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"evidence"?: NonNullable<Json>,"id"?: string,"narration"?: string,"ordinal"?: number,"owner_id"?: string,"plan_id"?: string,"project_id"?: string,"revision_id"?: string,"script_hash"?: string,"visual"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "scenes_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scenes_plan_id_revision_id_project_id_owner_id_fkey"
      columns: ["plan_id","revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "plan_versions"
      referencedColumns: ["id","revision_id","project_id","owner_id"]
    },{
      foreignKeyName: "scenes_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "scenes_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                },"upload_allocations": {
                  Row: {
                    "asset_id": string,"completed_at": string | null,"created_at": string,"expected_bytes": number,"expected_mime": string,"expires_at": string,"id": string,"owner_id": string,"project_id": string,"protocol": string,"reservation_id": string,"source_role": string,"state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"completed_at"?: string | null,"created_at"?: string,"expected_bytes": number,"expected_mime": string,"expires_at": string,"id"?: string,"owner_id": string,"project_id": string,"protocol": string,"reservation_id": string,"source_role": string,"state"?: string
                  }
                  Update: {
                    "asset_id"?: string,"completed_at"?: string | null,"created_at"?: string,"expected_bytes"?: number,"expected_mime"?: string,"expires_at"?: string,"id"?: string,"owner_id"?: string,"project_id"?: string,"protocol"?: string,"reservation_id"?: string,"source_role"?: string,"state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "upload_allocations_asset_id_project_id_owner_id_fkey"
      columns: ["asset_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id","project_id","owner_id"]
    },{
      foreignKeyName: "upload_allocations_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "upload_allocations_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "uploads_reservation_fk"
      columns: ["reservation_id","owner_id"]
isOneToOne: false
      referencedRelation: "usage_reservations"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"usage_accounts": {
                  Row: {
                    "byte_limit": number,"id": string,"output_limit": number | null,"owner_id": string | null,"reserved_bytes": number,"reserved_outputs": number,"retained_outputs": number,"scope": string,"updated_at": string,"used_bytes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "byte_limit": number,"id"?: string,"output_limit"?: number | null,"owner_id"?: string | null,"reserved_bytes"?: number,"reserved_outputs"?: number,"retained_outputs"?: number,"scope": string,"updated_at"?: string,"used_bytes"?: number
                  }
                  Update: {
                    "byte_limit"?: number,"id"?: string,"output_limit"?: number | null,"owner_id"?: string | null,"reserved_bytes"?: number,"reserved_outputs"?: number,"retained_outputs"?: number,"scope"?: string,"updated_at"?: string,"used_bytes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_accounts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_ledger": {
                  Row: {
                    "asset_id": string | null,"created_at": string,"id": string,"operation_key": string,"owner_id": string | null,"reason": string,"reservation_id": string | null,"reserved_bytes_delta": number,"reserved_outputs_delta": number,"retained_outputs_delta": number,"used_bytes_delta": number
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id"?: string | null,"created_at"?: string,"id"?: string,"operation_key": string,"owner_id"?: string | null,"reason": string,"reservation_id"?: string | null,"reserved_bytes_delta": number,"reserved_outputs_delta": number,"retained_outputs_delta": number,"used_bytes_delta": number
                  }
                  Update: {
                    "asset_id"?: string | null,"created_at"?: string,"id"?: string,"operation_key"?: string,"owner_id"?: string | null,"reason"?: string,"reservation_id"?: string | null,"reserved_bytes_delta"?: number,"reserved_outputs_delta"?: number,"retained_outputs_delta"?: number,"used_bytes_delta"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_ledger_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_ledger_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_ledger_reservation_id_fkey"
      columns: ["reservation_id"]
isOneToOne: false
      referencedRelation: "usage_reservations"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_reservations": {
                  Row: {
                    "bytes_remaining": number,"created_at": string,"expires_at": string | null,"id": string,"job_id": string | null,"kind": string,"output_slots_remaining": number,"owner_id": string,"state": string,"updated_at": string,"upload_allocation_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes_remaining": number,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"job_id"?: string | null,"kind": string,"output_slots_remaining": number,"owner_id": string,"state"?: string,"updated_at"?: string,"upload_allocation_id"?: string | null
                  }
                  Update: {
                    "bytes_remaining"?: number,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"job_id"?: string | null,"kind"?: string,"output_slots_remaining"?: number,"owner_id"?: string,"state"?: string,"updated_at"?: string,"upload_allocation_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_reservations_job_id_owner_id_fkey"
      columns: ["job_id","owner_id"]
isOneToOne: false
      referencedRelation: "job_summaries"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "usage_reservations_job_id_owner_id_fkey"
      columns: ["job_id","owner_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "usage_reservations_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_reservations_upload_allocation_id_owner_id_fkey"
      columns: ["upload_allocation_id","owner_id"]
isOneToOne: false
      referencedRelation: "upload_allocations"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"worker_credentials": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"last_used_at": string | null,"revoked_at": string | null,"token_hash": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"last_used_at"?: string | null,"revoked_at"?: string | null,"token_hash": string,"worker_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"last_used_at"?: string | null,"revoked_at"?: string | null,"token_hash"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "worker_credentials_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"worker_slots": {
                  Row: {
                    "job_id": string | null,"lease_expires_at": string | null,"lease_token": number | null,"slot_name": string,"worker_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "job_id"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: number | null,"slot_name": string,"worker_id"?: string | null
                  }
                  Update: {
                    "job_id"?: string | null,"lease_expires_at"?: string | null,"lease_token"?: number | null,"slot_name"?: string,"worker_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "worker_slots_job_id_fkey"
      columns: ["job_id"]
isOneToOne: true
      referencedRelation: "job_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "worker_slots_job_id_fkey"
      columns: ["job_id"]
isOneToOne: true
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "worker_slots_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"workers": {
                  Row: {
                    "capabilities": NonNullable<Json>,"created_at": string,"enabled": boolean,"health": NonNullable<Json>,"id": string,"label": string,"last_seen_at": string | null,"protocol_version": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capabilities"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"health"?: NonNullable<Json>,"id"?: string,"label": string,"last_seen_at"?: string | null,"protocol_version": number,"updated_at"?: string
                  }
                  Update: {
                    "capabilities"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"health"?: NonNullable<Json>,"id"?: string,"label"?: string,"last_seen_at"?: string | null,"protocol_version"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "job_summaries": {
                  Row: {
                    "created_at": string,"event_sequence": number,"id": string,"kind": string,"owner_id": string,"progress": NonNullable<Json>,"project_id": string,"retry_at": string | null,"revision_id": string,"safe_error_code": string | null,"safe_message": string | null,"stage": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"event_sequence"?: number | null,"id"?: string | null,"kind"?: string | null,"owner_id"?: string | null,"progress"?: Json | null,"project_id"?: string | null,"retry_at"?: string | null,"revision_id"?: string | null,"safe_error_code"?: string | null,"safe_message"?: string | null,"stage"?: string | null,"status"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"event_sequence"?: number | null,"id"?: string | null,"kind"?: string | null,"owner_id"?: string | null,"progress"?: Json | null,"project_id"?: string | null,"retry_at"?: string | null,"revision_id"?: string | null,"safe_error_code"?: string | null,"safe_message"?: string | null,"stage"?: string | null,"status"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "jobs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_project_id_owner_id_fkey"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "jobs_revision_id_project_id_owner_id_fkey"
      columns: ["revision_id","project_id","owner_id"]
isOneToOne: false
      referencedRelation: "revisions"
      referencedColumns: ["id","project_id","owner_id"]
    }
                  ]
                }
          }
          Functions: {
            "create_project_draft":
{ Args: { "new_input": Json,"new_mode": string,"new_preferences": Json,"new_title": string,"project": string,"request_hash": string,"request_key": string }; Returns: Json
                           },
"get_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_project_draft":
{ Args: { "project": string }; Returns: Json
                           },
"purge_revision_plans":
{ Args: { "target_revision": string }; Returns: number
                           },
"save_project_draft":
{ Args: { "expected_version": number,"new_input": Json,"new_mode": string,"new_preferences": Json,"new_title": string,"project": string }; Returns: {
              "draft_version": number,"id": string
            }[]
                           },
"update_display_name":
{ Args: { "expected_version": number,"new_name": string }; Returns: {
              "display_name": string,"settings_version": number
            }[]
                           },
"update_project_draft":
{ Args: { "expected_version": number,"new_input": Json,"new_preferences": Json,"new_title": string,"project": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
