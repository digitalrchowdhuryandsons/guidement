export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
       affiliate_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          affiliate_id: string | null
          created_at: string
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          affiliate_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_audit_log_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          campaign_id: string | null
          clicks: number
          conversions: number
          course_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          landing_path: string
          slug: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          landing_path?: string
          slug: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          landing_path?: string
          slug?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_campaign_fk"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          audience_size: string | null
          code: string
          created_at: string
          display_name: string | null
          id: string
          payout_details: Json
          payout_method: Database["public"]["Enums"]["payout_method"] | null
          promo_channels: string | null
          risk_score: number
          status: Database["public"]["Enums"]["affiliate_status"]
          suspended_reason: string | null
          tax_id: string | null
          terms_accepted_at: string | null
          total_clicks: number
          total_earned_cents: number
          total_paid_cents: number
          total_sales: number
          total_signups: number
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          audience_size?: string | null
          code: string
          created_at?: string
          display_name?: string | null
          id?: string
          payout_details?: Json
          payout_method?: Database["public"]["Enums"]["payout_method"] | null
          promo_channels?: string | null
          risk_score?: number
          status?: Database["public"]["Enums"]["affiliate_status"]
          suspended_reason?: string | null
          tax_id?: string | null
          terms_accepted_at?: string | null
          total_clicks?: number
          total_earned_cents?: number
          total_paid_cents?: number
          total_sales?: number
          total_signups?: number
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          audience_size?: string | null
          code?: string
          created_at?: string
          display_name?: string | null
          id?: string
          payout_details?: Json
          payout_method?: Database["public"]["Enums"]["payout_method"] | null
          promo_channels?: string | null
          risk_score?: number
          status?: Database["public"]["Enums"]["affiliate_status"]
          suspended_reason?: string | null
          tax_id?: string | null
          terms_accepted_at?: string | null
          total_clicks?: number
          total_earned_cents?: number
          total_paid_cents?: number
          total_sales?: number
          total_signups?: number
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      analytics_snapshots: {
        Row: {
          affiliate_id: string
          clicks: number
          commission_cents: number
          created_at: string
          id: string
          revenue_cents: number
          sales: number
          signups: number
          snapshot_date: string
          unique_clicks: number
        }
        Insert: {
          affiliate_id: string
          clicks?: number
          commission_cents?: number
          created_at?: string
          id?: string
          revenue_cents?: number
          sales?: number
          signups?: number
          snapshot_date: string
          unique_clicks?: number
        }
        Update: {
          affiliate_id?: string
          clicks?: number
          commission_cents?: number
          created_at?: string
          id?: string
          revenue_cents?: number
          sales?: number
          signups?: number
          snapshot_date?: string
          unique_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bonus_flat_cents: number | null
          bonus_percent: number | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          bonus_flat_cents?: number | null
          bonus_percent?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          bonus_flat_cents?: number | null
          bonus_percent?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
       click_events: {
        Row: {
          affiliate_id: string
          browser: string | null
          campaign_id: string | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          ip_hash: string | null
          is_bot: boolean
          is_unique: boolean
          landing_page: string | null
          link_id: string | null
          os: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          affiliate_id: string
          browser?: string | null
          campaign_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          is_unique?: boolean
          landing_page?: string | null
          link_id?: string | null
          os?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          affiliate_id?: string
          browser?: string | null
          campaign_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          is_unique?: boolean
          landing_page?: string | null
          link_id?: string | null
          os?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          attribution_model: string
          cookie_days: number
          course_id: string | null
          created_at: string
          flat_cents: number | null
          id: string
          is_active: boolean
          percent: number | null
          scope: string
          updated_at: string
        }
        Insert: {
          attribution_model?: string
          cookie_days?: number
          course_id?: string | null
          created_at?: string
          flat_cents?: number | null
          id?: string
          is_active?: boolean
          percent?: number | null
          scope: string
          updated_at?: string
        }
        Update: {
          attribution_model?: string
          cookie_days?: number
          course_id?: string | null
          created_at?: string
          flat_cents?: number | null
          id?: string
          is_active?: boolean
          percent?: number | null
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_price_tiers: {
  Row: {
    id: string
    course_id: string
    region_code: string
    label: string
    currency: string
    price: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    course_id: string
    region_code: string
    label: string
    currency?: string
    price: number
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    course_id?: string
    region_code?: string
    label?: string
    currency?: string
    price?: number
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "course_price_tiers_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
  ]
}

course_versions: {
  Row: {
    id: string
    course_id: string
    version_label: string
    notes: string | null
    created_by: string | null
    created_at: string
  }
  Insert: {
    id?: string
    course_id: string
    version_label: string
    notes?: string | null
    created_by?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    course_id?: string
    version_label?: string
    notes?: string | null
    created_by?: string | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "course_versions_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
  ]
}

course_tutorials: {
  Row: {
    id: string
    course_id: string
    title: string
    description: string | null
    video_url: string | null
    thumbnail_url: string | null
    duration: number | null
    position: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    course_id: string
    title: string
    description?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    duration?: number | null
    position?: number
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    course_id?: string
    title?: string
    description?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    duration?: number | null
    position?: number
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "course_tutorials_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
  ]
}

student_certificates: {
  Row: {
    id: string
    user_id: string
    course_id: string
    certification_id: string | null
    certificate_url: string | null
    score_percent: number | null
    issued_at: string
  }
  Insert: {
    id?: string
    user_id: string
    course_id: string
    certification_id?: string | null
    certificate_url?: string | null
    score_percent?: number | null
    issued_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    course_id?: string
    certification_id?: string | null
    certificate_url?: string | null
    score_percent?: number | null
    issued_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "student_certificates_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "student_certificates_certification_id_fkey"
      columns: ["certification_id"]
      isOneToOne: false
      referencedRelation: "course_certifications"
      referencedColumns: ["id"]
    },
  ]
}

forum_threads: {
  Row: {
    id: string
    course_id: string
    user_id: string
    title: string
    body: string | null
    is_pinned: boolean
    is_locked: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    course_id: string
    user_id: string
    title: string
    body?: string | null
    is_pinned?: boolean
    is_locked?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    course_id?: string
    user_id?: string
    title?: string
    body?: string | null
    is_pinned?: boolean
    is_locked?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "forum_threads_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
  ]
}

forum_replies: {
  Row: {
    id: string
    thread_id: string
    user_id: string
    body: string
    created_at: string
  }
  Insert: {
    id?: string
    thread_id: string
    user_id: string
    body: string
    created_at?: string
  }
  Update: {
    id?: string
    thread_id?: string
    user_id?: string
    body?: string
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "forum_replies_thread_id_fkey"
      columns: ["thread_id"]
      isOneToOne: false
      referencedRelation: "forum_threads"
      referencedColumns: ["id"]
    },
  ]
}

course_landing_pages: {
  Row: {
    course_id: string
    headline: string | null
    subheadline: string | null
    hero_image_url: string | null
    video_url: string | null
    highlights: string[] | null
    faq: Json | null
    is_published: boolean
    updated_at: string
    updated_by: string | null
  }
  Insert: {
    course_id: string
    headline?: string | null
    subheadline?: string | null
    hero_image_url?: string | null
    video_url?: string | null
    highlights?: string[] | null
    faq?: Json | null
    is_published?: boolean
    updated_at?: string
    updated_by?: string | null
  }
  Update: {
    course_id?: string
    headline?: string | null
    subheadline?: string | null
    hero_image_url?: string | null
    video_url?: string | null
    highlights?: string[] | null
    faq?: Json | null
    is_published?: boolean
    updated_at?: string
    updated_by?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "course_landing_pages_course_id_fkey"
      columns: ["course_id"]
      isOneToOne: true
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },
  ]
}

platform_settings: {
  Row: {
    key: string
    value: Json
    updated_at: string
    updated_by: string | null
  }
  Insert: {
    key: string
    value?: Json
    updated_at?: string
    updated_by?: string | null
  }
  Update: {
    key?: string
    value?: Json
    updated_at?: string
    updated_by?: string | null
  }
  Relationships: []
}

      commissions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          approved_at: string | null
          base_cents: number
          campaign_id: string | null
          course_id: string | null
          created_at: string
          currency: string
          flat_cents: number | null
          id: string
          notes: string | null
          paid_at: string | null
          purchase_id: string
          rate_percent: number | null
          referral_id: string | null
          reversed_at: string | null
          rule_snapshot: Json
          state: Database["public"]["Enums"]["commission_state"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          approved_at?: string | null
          base_cents: number
          campaign_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          flat_cents?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          purchase_id: string
          rate_percent?: number | null
          referral_id?: string | null
          reversed_at?: string | null
          rule_snapshot?: Json
          state?: Database["public"]["Enums"]["commission_state"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          approved_at?: string | null
          base_cents?: number
          campaign_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          flat_cents?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          purchase_id?: string
          rate_percent?: number | null
          referral_id?: string | null
          reversed_at?: string | null
          rule_snapshot?: Json
          state?: Database["public"]["Enums"]["commission_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
       fraud_reports: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          reviewer_id: string | null
          reviewer_notes: string | null
          risk_score: number
          rule_hits: Json
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          risk_score?: number
          rule_hits?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          risk_score?: number
          rule_hits?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_reports_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
        payout_transactions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_ref: string | null
          raw: Json
          status: string
          withdrawal_id: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          provider: string
          provider_ref?: string | null
          raw?: Json
          status: string
          withdrawal_id: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          raw?: Json
          status?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_transactions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
       referrals: {
        Row: {
          affiliate_id: string
          attributed_at: string | null
          campaign_id: string | null
          created_at: string
          expires_at: string
          first_click_at: string
          id: string
          last_click_at: string
          link_id: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          affiliate_id: string
          attributed_at?: string | null
          campaign_id?: string | null
          created_at?: string
          expires_at: string
          first_click_at: string
          id?: string
          last_click_at: string
          link_id?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          affiliate_id?: string
          attributed_at?: string | null
          campaign_id?: string | null
          created_at?: string
          expires_at?: string
          first_click_at?: string
          id?: string
          last_click_at?: string
          link_id?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
        withdrawals: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payout_method"]
          payout_details: Json
          processed_at: string | null
          razorpay_payout_id: string | null
          rejection_reason: string | null
          requested_at: string
          reviewer_id: string | null
          state: Database["public"]["Enums"]["withdrawal_state"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payout_method"]
          payout_details?: Json
          processed_at?: string | null
          razorpay_payout_id?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["withdrawal_state"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payout_method"]
          payout_details?: Json
          processed_at?: string | null
          razorpay_payout_id?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewer_id?: string | null
          state?: Database["public"]["Enums"]["withdrawal_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          current_uses: number
          discount_amount: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          current_uses?: number
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          current_uses?: number
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attachments: {
        Row: {
          course_id: string
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lecture_id: string | null
          position: number
          section_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lecture_id?: string | null
          position?: number
          section_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lecture_id?: string | null
          position?: number
          section_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_workshops: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          meeting_url: string | null
          position: number
          recording_url: string | null
          starts_at: string | null
          status: string
          host_name: string | null
          agenda: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          position?: number
          recording_url?: string | null
          starts_at?: string | null
          status?: string
          host_name?: string | null
          agenda?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          position?: number
          recording_url?: string | null
          starts_at?: string | null
          status?: string
          host_name?: string | null
          agenda?: string[] | null
          title?: string
          updated_at?: string
        }
                Relationships: [
          {
            foreignKeyName: "course_workshops_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certifications: {
        Row: {
          certificate_url: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          passing_score: number
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_events: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          event_url: string | null
          id: string
          is_active: boolean
          location: string | null
          position: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_url?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          position?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_url?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          position?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_communities: {
        Row: {
          community_url: string | null
          whatsapp_url: string | null
          faq: Json | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          platform: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          community_url?: string | null
          whatsapp_url?: string | null
          faq?: Json | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          platform?: string | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          community_url?: string | null
          whatsapp_url?: string | null
          faq?: Json | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          platform?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_community_messages: {
        Row: {
          course_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      course_player_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          lecture_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          id?: string
          lecture_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          lecture_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          is_approved: boolean
          is_published: boolean
          language: string | null
          level: string | null
          preview_video_url: string | null
          price: number
          requirements: string[] | null
          short_description: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          what_you_learn: string[] | null
          purchase_type: string  
          subscription_interval: string | null
          drip_enabled: boolean 
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          is_approved?: boolean
          is_published?: boolean
          language?: string | null
          level?: string | null
          preview_video_url?: string | null
          price?: number
          requirements?: string[] | null
          short_description?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          what_you_learn?: string[] | null
          purchase_type?: string
          subscription_interval?: string | null
          drip_enabled?: boolean
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          is_approved?: boolean
          is_published?: boolean
          language?: string | null
          level?: string | null
          preview_video_url?: string | null
          price?: number
          requirements?: string[] | null
          short_description?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          what_you_learn?: string[] | null
          purchase_type?: string
          subscription_interval?: string | null
          drip_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_profile_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      instructor_applications: {
        Row: {
          admin_notes: string | null
          bio: string
          created_at: string
          experience: string
          expertise: string
          id: string
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          bio: string
          created_at?: string
          experience: string
          expertise: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          bio?: string
          created_at?: string
          experience?: string
          expertise?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      lectures: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_preview: boolean
          position: number
          section_id: string
          title: string
          video_url: string | null
          drip_days: number  
          release_at: string | null 
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_preview?: boolean
          position?: number
          section_id: string
          title: string
          video_url?: string | null
          drip_days?: number
           release_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_preview?: boolean
          position?: number
          section_id?: string
          title?: string
          video_url?: string | null
          drip_days?: number
           release_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_retries: {
        Row: {
          course_id: string
          created_at: string
          event_type: string
          id: string
          razorpay_order_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          event_type: string
          id?: string
          razorpay_order_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          event_type?: string
          id?: string
          razorpay_order_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          amount: number
          course_id: string
          course_title: string | null
          created_at: string
          currency: string
          expires_at: string
          id: string
          key_id: string
          razorpay_order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          course_title?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          key_id: string
          razorpay_order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          course_title?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          key_id?: string
          razorpay_order_id?: string
          user_id?: string
          
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          updated_at: string
          user_id: string
          website: string | null
          country: string | null 
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          updated_at?: string
          user_id: string
          website?: string | null
          country?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          country?: string | null
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_position: number | null
          lecture_id: string
          updated_at: string
          user_id: string
          watch_time: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position?: number | null
          lecture_id: string
          updated_at?: string
          user_id: string
          watch_time?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position?: number | null
          lecture_id?: string
          updated_at?: string
          user_id?: string
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_attempts: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_guest: boolean
          lecture_id: string | null
          source: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_guest?: boolean
          lecture_id?: string | null
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_guest?: boolean
          lecture_id?: string | null
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          coupon_id: string | null
          course_id: string
          created_at: string
          id: string
          status: string | null
          stripe_payment_id: string | null
          user_id: string
          refunded_at: string | null   
          refund_amount: number | null 
          refund_reason: string | null  
        }
        Insert: {
          amount: number
          coupon_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          user_id: string
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
        }
        Update: {
          amount?: number
          coupon_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          user_id?: string
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          correct_count: number
          course_id: string
          created_at: string
          id: string
          score_percent: number
          section_id: string
          total_questions: number
          user_id: string
          wrong_lecture_ids: string[]
        }
        Insert: {
          correct_count?: number
          course_id: string
          created_at?: string
          id?: string
          score_percent?: number
          section_id: string
          total_questions?: number
          user_id: string
          wrong_lecture_ids?: string[]
        }
        Update: {
          correct_count?: number
          course_id?: string
          created_at?: string
          id?: string
          score_percent?: number
          section_id?: string
          total_questions?: number
          user_id?: string
          wrong_lecture_ids?: string[]
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          id: string
          lecture_id: string | null
          options: Json
          position: number
          question: string
          section_id: string
          updated_at: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          options?: Json
          position?: number
          question: string
          section_id: string
          updated_at?: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          options?: Json
          position?: number
          question?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          lecture_id: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          lecture_id: string
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          lecture_id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
       site_content: {
        Row: {
          data: Json
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
       support_tickets: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
 Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          banned_until: string
          created_at: string
          email: string
          full_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_retry_user_details: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_purchased: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_use: { Args: { _coupon_id: string }; Returns: boolean }
      is_affiliate_owner: { Args: { _affiliate_id: string }; Returns: boolean }
      is_lecture_preview: { Args: { _lecture_id: string }; Returns: boolean }
      validate_coupon: {
        Args: { _code: string; _course_id: string; _price: number }
        Returns: {
          coupon_id: string
          discount: number
          discounted_price: number
          reason: string
        }[]
      }
    }
    Enums: {
      affiliate_status: "pending" | "approved" | "rejected" | "suspended"
      app_role: "student" | "instructor" | "admin" | "super_admin" | "affiliate" | "support"
      commission_state:
        | "pending"
        | "approved"
        | "paid"
        | "rejected"
        | "reversed"
      payout_method: "bank" | "upi" | "paypal" | "stripe"
      withdrawal_state:
        | "requested"
        | "approved"
        | "processing"
        | "paid"
        | "failed"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      affiliate_status: ["pending", "approved", "rejected", "suspended"],
      app_role: ["student", "instructor", "admin", "super_admin", "affiliate", "support"],
      commission_state: ["pending", "approved", "paid", "rejected", "reversed"],
      payout_method: ["bank", "upi", "paypal", "stripe"],
      withdrawal_state: [
        "requested",
        "approved",
        "processing",
        "paid",
        "failed",
        "rejected",
      ],
    },
  },
} as const