export interface Account {
  id: number;
  platform: string;
  handle: string;
  profile_url: string;
  pod_owner: string;
  backup_owner: string;
  status_tag: 'active' | 'paused' | 'archived';
  cadence_target_per_week: number;
  last_post_ts: string | null;
  priority_level: 'high' | 'medium' | 'low';
}

export interface Metric {
  id: number;
  account_id: number;
  timestamp: string;
  posts_per_day_7d: number;
  avg_reach_7d: number;
  saves_7d: number;
  shares_7d: number;
  watch_time_7d: number;
  follower_delta_7d: number;
  likes_7d?: number;
  dislikes_7d?: number;
}

export interface Alert {
  id: number;
  account_id: number;
  type: 'cadence_gap' | 'metric_drop' | 'threshold_breach';
  message: string;
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'ignored';
  created_at: string;
  handle?: string;
  platform?: string;
}

export interface ScheduledPost {
  id: number;
  account_id: number;
  platform: string;
  content_type: string;
  scheduled_time: string;
  status: 'scheduled' | 'deployed' | 'failed';
  caption: string;
  asset_url: string;
  handle?: string;
}

export interface ReadyAsset {
  id: number;
  title: string;
  type: string;
  url: string;
  thumbnail_url: string;
  status: 'ready' | 'used' | 'archived';
  created_at: string;
}

export interface AuditLog {
  id: number;
  account_id: number;
  timestamp: string;
  reviewer: string;
  thumbnail_ok: boolean;
  captions_ok: boolean;
  cta_ok: boolean;
  cadence_ok: boolean;
  notes: string;
  reviewed?: boolean;
  handle?: string;
  platform?: string;
}

export interface Insight {
  id: number;
  content: string;
  created_at: string;
  tags: string; // JSON string
}

export interface Settings {
  alert_destinations: {
    email: string;
    slack: string;
    whatsapp: string;
  };
  thresholds: {
    reach_drop: number;
    cadence_gap_hours: number;
  };
}
