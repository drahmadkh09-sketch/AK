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
  date: string;
  posts_count: number;
  reach: number;
  saves: number;
  shares: number;
  watch_time: number;
  follower_delta: number;
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
