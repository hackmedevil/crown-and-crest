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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      abandoned_checkouts: {
        Row: {
          abandoned_at: string
          amount: number
          checkout_data: Json
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_phone: string | null
          id: string
          order_id: string | null
          razorpay_order_id: string
          recovered_at: string | null
          recovery_attempted_at: string | null
          updated_at: string
        }
        Insert: {
          abandoned_at?: string
          amount: number
          checkout_data: Json
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          razorpay_order_id: string
          recovered_at?: string | null
          recovery_attempted_at?: string | null
          updated_at?: string
        }
        Update: {
          abandoned_at?: string
          amount?: number
          checkout_data?: Json
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          razorpay_order_id?: string
          recovered_at?: string | null
          recovery_attempted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_checkouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      account_offers: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          firebase_uid: string
          id: string
          offer_code: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          firebase_uid: string
          id?: string
          offer_code: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          firebase_uid?: string
          id?: string
          offer_code?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_offers_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
        ]
      }
      account_recently_viewed: {
        Row: {
          firebase_uid: string
          id: string
          product_id: string
          viewed_at: string
        }
        Insert: {
          firebase_uid: string
          id?: string
          product_id: string
          viewed_at?: string
        }
        Update: {
          firebase_uid?: string
          id?: string
          product_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_recently_viewed_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
          {
            foreignKeyName: "account_recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      account_recommendations: {
        Row: {
          created_at: string
          firebase_uid: string
          id: string
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          firebase_uid: string
          id?: string
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          firebase_uid?: string
          id?: string
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_recommendations_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
          {
            foreignKeyName: "account_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      account_rewards: {
        Row: {
          firebase_uid: string
          points: number
          referral_code: string | null
          tier: string
          tier_progress: number
          updated_at: string
        }
        Insert: {
          firebase_uid: string
          points?: number
          referral_code?: string | null
          tier?: string
          tier_progress?: number
          updated_at?: string
        }
        Update: {
          firebase_uid?: string
          points?: number
          referral_code?: string | null
          tier?: string
          tier_progress?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_rewards_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
        ]
      }
      account_savings: {
        Row: {
          firebase_uid: string
          total_saved: number
          updated_at: string
        }
        Insert: {
          firebase_uid: string
          total_saved?: number
          updated_at?: string
        }
        Update: {
          firebase_uid?: string
          total_saved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_savings_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
        ]
      }
      account_wallets: {
        Row: {
          balance: number
          firebase_uid: string
          updated_at: string
        }
        Insert: {
          balance?: number
          firebase_uid: string
          updated_at?: string
        }
        Update: {
          balance?: number
          firebase_uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_wallets_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
        ]
      }
      account_wishlist_items: {
        Row: {
          created_at: string
          firebase_uid: string
          id: string
          price_alert: boolean
          product_id: string
          stock_alert: boolean
        }
        Insert: {
          created_at?: string
          firebase_uid: string
          id?: string
          price_alert?: boolean
          product_id: string
          stock_alert?: boolean
        }
        Update: {
          created_at?: string
          firebase_uid?: string
          id?: string
          price_alert?: boolean
          product_id?: string
          stock_alert?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "account_wishlist_items_firebase_uid_fkey"
            columns: ["firebase_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["firebase_uid"]
          },
          {
            foreignKeyName: "account_wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "account_wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_keys: {
        Row: {
          config_json: Json | null
          created_at: string | null
          encrypted_key: string
          health_status: Json | null
          id: string
          is_active: boolean | null
          label: string | null
          last_health_check: string | null
          last_used_at: string | null
          model_priority: Json | null
          provider_id: string | null
          selected_model: string | null
          selected_models: Json | null
          updated_at: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          encrypted_key: string
          health_status?: Json | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_health_check?: string | null
          last_used_at?: string | null
          model_priority?: Json | null
          provider_id?: string | null
          selected_model?: string | null
          selected_models?: Json | null
          updated_at?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          encrypted_key?: string
          health_status?: Json | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_health_check?: string | null
          last_used_at?: string | null
          model_priority?: Json | null
          provider_id?: string | null
          selected_model?: string | null
          selected_models?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_priorities: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_tested_at: string | null
          model_id: string
          priority: number | null
          provider_id: string | null
          test_latency_ms: number | null
          test_success: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_tested_at?: string | null
          model_id: string
          priority?: number | null
          provider_id?: string | null
          test_latency_ms?: number | null
          test_success?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_tested_at?: string | null
          model_id?: string
          priority?: number | null
          provider_id?: string | null
          test_latency_ms?: number | null
          test_success?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_priorities_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_notifications: {
        Row: {
          created_at: string | null
          details: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          model_id: string | null
          provider_id: string | null
          severity: string
          type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          model_id?: string | null
          provider_id?: string | null
          severity: string
          type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          model_id?: string | null
          provider_id?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_notifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_presets: {
        Row: {
          config_json: Json | null
          created_at: string | null
          id: string
          is_default: boolean | null
          max_tokens: number | null
          model_name: string | null
          preset_name: string
          provider_id: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          preset_name: string
          provider_id?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          preset_name?: string
          provider_id?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_presets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_product_memory: {
        Row: {
          ai_output: Json
          attributes: Json | null
          created_at: string
          embedding: string | null
          id: string
          image_description: string | null
          product_id: string | null
          source: string
          title: string | null
        }
        Insert: {
          ai_output: Json
          attributes?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          image_description?: string | null
          product_id?: string | null
          source?: string
          title?: string | null
        }
        Update: {
          ai_output?: Json
          attributes?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          image_description?: string | null
          product_id?: string | null
          source?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_product_memory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "ai_product_memory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "ai_product_memory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          base_url: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string | null
          error_type: string | null
          id: string
          latency_ms: number | null
          model_id: string
          provider: string
          success: boolean
          tokens_used: number | null
        }
        Insert: {
          created_at?: string | null
          error_type?: string | null
          id?: string
          latency_ms?: number | null
          model_id: string
          provider: string
          success: boolean
          tokens_used?: number | null
        }
        Update: {
          created_at?: string | null
          error_type?: string | null
          id?: string
          latency_ms?: number | null
          model_id?: string
          provider?: string
          success?: boolean
          tokens_used?: number | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          firebase_uid: string
          id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          firebase_uid: string
          id?: string
          quantity: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          firebase_uid?: string
          id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_ranking_weights: {
        Row: {
          bestseller_boost_enabled: boolean | null
          cart_weight: number | null
          category_id: string
          conversion_weight: number | null
          created_at: string | null
          description: string | null
          id: string
          purchase_weight: number | null
          rating_weight: number | null
          recency_decay_enabled: boolean | null
          stock_penalty: number | null
          updated_at: string | null
          view_weight: number | null
        }
        Insert: {
          bestseller_boost_enabled?: boolean | null
          cart_weight?: number | null
          category_id: string
          conversion_weight?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          purchase_weight?: number | null
          rating_weight?: number | null
          recency_decay_enabled?: boolean | null
          stock_penalty?: number | null
          updated_at?: string | null
          view_weight?: number | null
        }
        Update: {
          bestseller_boost_enabled?: boolean | null
          cart_weight?: number | null
          category_id?: string
          conversion_weight?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          purchase_weight?: number | null
          rating_weight?: number | null
          recency_decay_enabled?: boolean | null
          stock_penalty?: number | null
          updated_at?: string | null
          view_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_ranking_weights_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "collection_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "collection_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      color_group_images: {
        Row: {
          alt_text: string | null
          color_group_id: string
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          position: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          color_group_id: string
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          color_group_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_color_group_images_color_group_id"
            columns: ["color_group_id"]
            isOneToOne: false
            referencedRelation: "color_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      color_groups: {
        Row: {
          color_id: string
          color_name: string
          created_at: string | null
          enabled: boolean
          hex_code: string | null
          id: string
          position: number | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          color_id: string
          color_name: string
          created_at?: string | null
          enabled?: boolean
          hex_code?: string | null
          id?: string
          position?: number | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          color_id?: string
          color_name?: string
          created_at?: string | null
          enabled?: boolean
          hex_code?: string | null
          id?: string
          position?: number | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_color_groups_color_id"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_color_groups_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_color_groups_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_color_groups_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      color_palettes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string
          display_order: number | null
          hex_code: string
          id: string
          is_active: boolean
          name: string
          palette_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          hex_code: string
          id?: string
          is_active?: boolean
          name: string
          palette_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          hex_code?: string
          id?: string
          is_active?: boolean
          name?: string
          palette_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colors_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "color_palettes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          applied_at: string
          coupon_id: string
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          coupon_id: string
          discount_amount: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          coupon_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          maximum_discount_amount: number | null
          minimum_order_amount: number | null
          per_user_limit: number | null
          starts_at: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      embedding_jobs: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          priority: number
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          priority?: number
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          priority?: number
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          collection_id: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          position: number
          title: string
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          title: string
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          title?: string
          type?: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_sections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      media_collections: {
        Row: {
          collection_type: Database["public"]["Enums"]["media_collection_type"]
          created_at: string
          id: string
          label: string | null
          product_id: string | null
          variant_id: string | null
        }
        Insert: {
          collection_type?: Database["public"]["Enums"]["media_collection_type"]
          created_at?: string
          id?: string
          label?: string | null
          product_id?: string | null
          variant_id?: string | null
        }
        Update: {
          collection_type?: Database["public"]["Enums"]["media_collection_type"]
          created_at?: string
          id?: string
          label?: string | null
          product_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "media_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "media_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_collections_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_disputes: {
        Row: {
          amount: number
          created_at: string
          dispute_data: Json
          dispute_id: string
          id: string
          order_id: string
          razorpay_payment_id: string
          reason_code: string | null
          reason_description: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          dispute_data: Json
          dispute_id: string
          id?: string
          order_id: string
          razorpay_payment_id: string
          reason_code?: string | null
          reason_description?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          dispute_data?: Json
          dispute_id?: string
          id?: string
          order_id?: string
          razorpay_payment_id?: string
          reason_code?: string | null
          reason_description?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_inventory_logs: {
        Row: {
          action: string
          context: Json | null
          created_at: string
          error_reason: string | null
          id: string
          order_id: string
          reservation_ids: string[] | null
          user_uid: string | null
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string
          error_reason?: string | null
          id?: string
          order_id: string
          reservation_ids?: string[] | null
          user_uid?: string | null
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string
          error_reason?: string | null
          id?: string
          order_id?: string
          reservation_ids?: string[] | null
          user_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_inventory_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_purchase: number
          quantity: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_purchase: number
          quantity: number
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_purchase?: number
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          razorpay_payment_id: string
          razorpay_refund_id: string
          refund_data: Json
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          razorpay_payment_id: string
          razorpay_refund_id: string
          refund_data: Json
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          razorpay_payment_id?: string
          razorpay_refund_id?: string
          refund_data?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          actual_shipping_fee: number | null
          amount: number
          cod_allowed_by_razorpay: boolean | null
          cod_eligibility_reason: string | null
          cod_fee: number | null
          coupon_code: string | null
          coupon_id: string | null
          courier_name: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_phone: string | null
          discount_amount: number | null
          estimated_delivery_date: string | null
          firebase_uid: string
          gateway_notes: Json | null
          id: string
          is_cod: boolean | null
          last_tracking_update: string | null
          payment_method: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_risk_tier: string | null
          refund_amount: number | null
          settled_at: string | null
          settlement_id: string | null
          shipment_status: string | null
          shipping_address: Json | null
          shiprocket_order_id: string | null
          shiprocket_shipment_id: string | null
          status: string
          tracking_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_shipping_fee?: number | null
          amount: number
          cod_allowed_by_razorpay?: boolean | null
          cod_eligibility_reason?: string | null
          cod_fee?: number | null
          coupon_code?: string | null
          coupon_id?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          firebase_uid: string
          gateway_notes?: Json | null
          id?: string
          is_cod?: boolean | null
          last_tracking_update?: string | null
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_risk_tier?: string | null
          refund_amount?: number | null
          settled_at?: string | null
          settlement_id?: string | null
          shipment_status?: string | null
          shipping_address?: Json | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          actual_shipping_fee?: number | null
          amount?: number
          cod_allowed_by_razorpay?: boolean | null
          cod_eligibility_reason?: string | null
          cod_fee?: number | null
          coupon_code?: string | null
          coupon_id?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          firebase_uid?: string
          gateway_notes?: Json | null
          id?: string
          is_cod?: boolean | null
          last_tracking_update?: string | null
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_risk_tier?: string | null
          refund_amount?: number | null
          settled_at?: string | null
          settlement_id?: string | null
          shipment_status?: string | null
          shipping_address?: Json | null
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          status?: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          add_to_cart_count: number | null
          created_at: string | null
          last_updated: string | null
          orders_count: number | null
          product_id: string
          rating: number | null
          review_count: number | null
          total_revenue: number | null
          total_views: number | null
          views_30d: number | null
          views_7d: number | null
        }
        Insert: {
          add_to_cart_count?: number | null
          created_at?: string | null
          last_updated?: string | null
          orders_count?: number | null
          product_id: string
          rating?: number | null
          review_count?: number | null
          total_revenue?: number | null
          total_views?: number | null
          views_30d?: number | null
          views_7d?: number | null
        }
        Update: {
          add_to_cart_count?: number | null
          created_at?: string | null
          last_updated?: string | null
          orders_count?: number | null
          product_id?: string
          rating?: number | null
          review_count?: number | null
          total_revenue?: number | null
          total_views?: number | null
          views_30d?: number | null
          views_7d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combinations: {
        Row: {
          combo_value: number | null
          frequency: number | null
          frequently_bought_with_id: string
          id: string
          last_updated: string | null
          product_id: string
        }
        Insert: {
          combo_value?: number | null
          frequency?: number | null
          frequently_bought_with_id: string
          id?: string
          last_updated?: string | null
          product_id: string
        }
        Update: {
          combo_value?: number | null
          frequency?: number | null
          frequently_bought_with_id?: string
          id?: string
          last_updated?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_combinations_frequently_bought_with_id_fkey"
            columns: ["frequently_bought_with_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_combinations_frequently_bought_with_id_fkey"
            columns: ["frequently_bought_with_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_combinations_frequently_bought_with_id_fkey"
            columns: ["frequently_bought_with_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_combinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_combinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          created_at: string
          embedding: string
          generated_at: string
          id: string
          metadata: Json | null
          model_version: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          embedding: string
          generated_at?: string
          id?: string
          metadata?: Json | null
          model_version?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          embedding?: string
          generated_at?: string
          id?: string
          metadata?: Json | null
          model_version?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          cloudinary_public_id: string
          cloudinary_version: string | null
          created_at: string
          format: string | null
          height: number | null
          id: string
          is_primary: boolean
          position: number
          product_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          cloudinary_public_id: string
          cloudinary_version?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          cloudinary_public_id?: string
          cloudinary_version?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          aspect_ratio: number | null
          cloudinary_public_id: string
          collection_id: string | null
          created_at: string
          height: number | null
          id: string
          is_active: boolean
          is_primary: boolean
          position: number
          product_id: string
          resource_type: Database["public"]["Enums"]["media_resource_type"]
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          aspect_ratio?: number | null
          cloudinary_public_id: string
          collection_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          position?: number
          product_id: string
          resource_type: Database["public"]["Enums"]["media_resource_type"]
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          aspect_ratio?: number | null
          cloudinary_public_id?: string
          collection_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          position?: number
          product_id?: string
          resource_type?: Database["public"]["Enums"]["media_resource_type"]
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "media_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          product_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "product_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ranking_history: {
        Row: {
          id: string
          percentile: number | null
          product_id: string
          ranking_position: number | null
          ranking_score: number | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          percentile?: number | null
          product_id: string
          ranking_position?: number | null
          ranking_score?: number | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          percentile?: number | null
          product_id?: string
          ranking_position?: number | null
          ranking_score?: number | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ranking_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ranking_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ranking_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ranking_scores: {
        Row: {
          add_to_cart_count: number | null
          bestseller_boost: number | null
          cart_score: number | null
          conversion_rate: number | null
          last_updated: string | null
          product_id: string
          purchase_count: number | null
          ranking_score: number | null
          rating_score: number | null
          recency_decay_boost: number | null
          stock_score: number | null
          unique_session_views: number | null
          unique_user_views: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          add_to_cart_count?: number | null
          bestseller_boost?: number | null
          cart_score?: number | null
          conversion_rate?: number | null
          last_updated?: string | null
          product_id: string
          purchase_count?: number | null
          ranking_score?: number | null
          rating_score?: number | null
          recency_decay_boost?: number | null
          stock_score?: number | null
          unique_session_views?: number | null
          unique_user_views?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          add_to_cart_count?: number | null
          bestseller_boost?: number | null
          cart_score?: number | null
          conversion_rate?: number | null
          last_updated?: string | null
          product_id?: string
          purchase_count?: number | null
          ranking_score?: number | null
          rating_score?: number | null
          recency_decay_boost?: number | null
          stock_score?: number | null
          unique_session_views?: number | null
          unique_user_views?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ranking_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ranking_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ranking_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          images: Json | null
          product_id: string
          rating: number
          review_text: string | null
          title: string
          unhelpful_count: number | null
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          verified_purchase: boolean | null
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          product_id: string
          rating: number
          review_text?: string | null
          title: string
          unhelpful_count?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          verified_purchase?: boolean | null
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          product_id?: string
          rating?: number
          review_text?: string | null
          title?: string
          unhelpful_count?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_charts: {
        Row: {
          created_at: string
          product_id: string
          size_chart_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          product_id: string
          size_chart_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          product_id?: string
          size_chart_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_charts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_size_charts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_size_charts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_charts_size_chart_id_fkey"
            columns: ["size_chart_id"]
            isOneToOne: false
            referencedRelation: "size_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_profiles: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          size_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          size_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          size_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_size_profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_size_profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_profiles_size_profile_id_fkey"
            columns: ["size_profile_id"]
            isOneToOne: false
            referencedRelation: "size_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          ai_description: string | null
          ai_metadata: Json | null
          ai_tags: string[] | null
          ai_title: string | null
          average_rating: number | null
          base_price: number
          brand: string | null
          brand_id: string | null
          bullet_points: string[] | null
          category: string | null
          category_id: string | null
          color_definitions: Json | null
          cost_price: number | null
          country_of_origin: string | null
          created_at: string | null
          description: string | null
          dimensions_json: Json | null
          discount_engine_enabled: boolean
          discount_type: string
          discount_value: number | null
          embedding: string | null
          embedding_status: string | null
          enable_variant_image_switching: boolean
          fabric: string | null
          featured: boolean | null
          fit: string | null
          fit_type: string | null
          gender: string | null
          gsm: number | null
          hs_code: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean
          is_bestseller: boolean | null
          is_new: boolean | null
          is_on_sale: boolean | null
          is_searchable: boolean
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          mrp: number | null
          name: string
          palette_id: string | null
          print_type: string | null
          published: boolean | null
          purchase_count: number | null
          ranking_score: number | null
          review_count: number | null
          search_metadata: Json | null
          search_vector: unknown
          season: string | null
          selling_price: number | null
          seo_keywords: string[] | null
          seo_slug: string | null
          shipping_charge: number | null
          shipping_included_in_price: boolean | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          style: string[] | null
          style_keywords: string[] | null
          tags: string[] | null
          target_audience: string | null
          usage: string | null
          verified_purchase_count: number | null
          view_count: number | null
          weather: string | null
          weight_grams: number | null
          wishlist_count: number | null
        }
        Insert: {
          active?: boolean | null
          ai_description?: string | null
          ai_metadata?: Json | null
          ai_tags?: string[] | null
          ai_title?: string | null
          average_rating?: number | null
          base_price: number
          brand?: string | null
          brand_id?: string | null
          bullet_points?: string[] | null
          category?: string | null
          category_id?: string | null
          color_definitions?: Json | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          dimensions_json?: Json | null
          discount_engine_enabled?: boolean
          discount_type?: string
          discount_value?: number | null
          embedding?: string | null
          embedding_status?: string | null
          enable_variant_image_switching?: boolean
          fabric?: string | null
          featured?: boolean | null
          fit?: string | null
          fit_type?: string | null
          gender?: string | null
          gsm?: number | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_new?: boolean | null
          is_on_sale?: boolean | null
          is_searchable?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          mrp?: number | null
          name: string
          palette_id?: string | null
          print_type?: string | null
          published?: boolean | null
          purchase_count?: number | null
          ranking_score?: number | null
          review_count?: number | null
          search_metadata?: Json | null
          search_vector?: unknown
          season?: string | null
          selling_price?: number | null
          seo_keywords?: string[] | null
          seo_slug?: string | null
          shipping_charge?: number | null
          shipping_included_in_price?: boolean | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          style?: string[] | null
          style_keywords?: string[] | null
          tags?: string[] | null
          target_audience?: string | null
          usage?: string | null
          verified_purchase_count?: number | null
          view_count?: number | null
          weather?: string | null
          weight_grams?: number | null
          wishlist_count?: number | null
        }
        Update: {
          active?: boolean | null
          ai_description?: string | null
          ai_metadata?: Json | null
          ai_tags?: string[] | null
          ai_title?: string | null
          average_rating?: number | null
          base_price?: number
          brand?: string | null
          brand_id?: string | null
          bullet_points?: string[] | null
          category?: string | null
          category_id?: string | null
          color_definitions?: Json | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          dimensions_json?: Json | null
          discount_engine_enabled?: boolean
          discount_type?: string
          discount_value?: number | null
          embedding?: string | null
          embedding_status?: string | null
          enable_variant_image_switching?: boolean
          fabric?: string | null
          featured?: boolean | null
          fit?: string | null
          fit_type?: string | null
          gender?: string | null
          gsm?: number | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_new?: boolean | null
          is_on_sale?: boolean | null
          is_searchable?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          mrp?: number | null
          name?: string
          palette_id?: string | null
          print_type?: string | null
          published?: boolean | null
          purchase_count?: number | null
          ranking_score?: number | null
          review_count?: number | null
          search_metadata?: Json | null
          search_vector?: unknown
          season?: string | null
          selling_price?: number | null
          seo_keywords?: string[] | null
          seo_slug?: string | null
          shipping_charge?: number | null
          shipping_included_in_price?: boolean | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          style?: string[] | null
          style_keywords?: string[] | null
          tags?: string[] | null
          target_audience?: string | null
          usage?: string | null
          verified_purchase_count?: number | null
          view_count?: number | null
          weather?: string | null
          weight_grams?: number | null
          wishlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_palette_id"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "color_palettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ranking_refresh_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          last_updated: string | null
          refreshed_count: number | null
          status: string
          triggered_by: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          last_updated?: string | null
          refreshed_count?: number | null
          status?: string
          triggered_by?: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          last_updated?: string | null
          refreshed_count?: number | null
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      recently_viewed_products: {
        Row: {
          id: string
          last_viewed_at: string | null
          product_id: string
          session_id: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          id?: string
          last_viewed_at?: string | null
          product_id: string
          session_id?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          id?: string
          last_viewed_at?: string | null
          product_id?: string
          session_id?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recently_viewed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "recently_viewed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          created_at: string
          id: string
          images_url: string[] | null
          order_item_id: string
          quantity: number
          reason_for_item: Database["public"]["Enums"]["return_reason"]
          return_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images_url?: string[] | null
          order_item_id: string
          quantity: number
          reason_for_item: Database["public"]["Enums"]["return_reason"]
          return_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images_url?: string[] | null
          order_item_id?: string
          quantity?: number
          reason_for_item?: Database["public"]["Enums"]["return_reason"]
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          actual_refund_date: string | null
          courier_name: string | null
          created_at: string
          estimated_refund_date: string | null
          firebase_uid: string
          id: string
          images_url: string[] | null
          order_id: string
          pickup_address: Json | null
          pickup_scheduled_date: string | null
          reason_code: Database["public"]["Enums"]["return_reason"]
          reason_comments: string | null
          refund_amount: number | null
          refund_method: Database["public"]["Enums"]["refund_method"]
          resolution: Database["public"]["Enums"]["return_resolution"]
          status: Database["public"]["Enums"]["return_status"]
          tracking_link: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_refund_date?: string | null
          courier_name?: string | null
          created_at?: string
          estimated_refund_date?: string | null
          firebase_uid: string
          id?: string
          images_url?: string[] | null
          order_id: string
          pickup_address?: Json | null
          pickup_scheduled_date?: string | null
          reason_code: Database["public"]["Enums"]["return_reason"]
          reason_comments?: string | null
          refund_amount?: number | null
          refund_method?: Database["public"]["Enums"]["refund_method"]
          resolution: Database["public"]["Enums"]["return_resolution"]
          status?: Database["public"]["Enums"]["return_status"]
          tracking_link?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_refund_date?: string | null
          courier_name?: string | null
          created_at?: string
          estimated_refund_date?: string | null
          firebase_uid?: string
          id?: string
          images_url?: string[] | null
          order_id?: string
          pickup_address?: Json | null
          pickup_scheduled_date?: string | null
          reason_code?: Database["public"]["Enums"]["return_reason"]
          reason_comments?: string | null
          refund_amount?: number | null
          refund_method?: Database["public"]["Enums"]["refund_method"]
          resolution?: Database["public"]["Enums"]["return_resolution"]
          status?: Database["public"]["Enums"]["return_status"]
          tracking_link?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpfulness: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpfulness_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          clicked_product_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          results_count: number
          search_query: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_product_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          results_count?: number
          search_query: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_product_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          results_count?: number
          search_query?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_analytics_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "search_analytics_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "search_analytics_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      search_query_embeddings: {
        Row: {
          attempts: number
          created_at: string
          embedding: string | null
          last_error: string | null
          query: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          embedding?: string | null
          last_error?: string | null
          query: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          embedding?: string | null
          last_error?: string | null
          query?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      size_charts: {
        Row: {
          category: string
          created_at: string
          fit_type: string | null
          id: string
          measurement_unit: string
          measurements: Json
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          fit_type?: string | null
          id?: string
          measurement_unit?: string
          measurements: Json
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          fit_type?: string | null
          id?: string
          measurement_unit?: string
          measurements?: Json
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      size_profiles: {
        Row: {
          category: string
          created_at: string
          fit_rules: Json | null
          id: string
          measurements: Json
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          fit_rules?: Json | null
          id?: string
          measurements: Json
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          fit_rules?: Json | null
          id?: string
          measurements?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_notifications: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          order_id: string
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          order_id: string
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          order_id?: string
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          expires_at: string | null
          id: string
          order_id: string
          quantity: number
          reserved_at: string
          status: string
          user_uid: string | null
          variant_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          order_id: string
          quantity: number
          reserved_at?: string
          status: string
          user_uid?: string | null
          variant_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          order_id?: string
          quantity?: number
          reserved_at?: string
          status?: string
          user_uid?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          created_at: string
          id: number
          logo_url: string | null
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          logo_url?: string | null
          store_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          logo_url?: string | null
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_size_profile: {
        Row: {
          category: string
          created_at: string
          id: string
          measurements: Json
          updated_at: string
          user_uid: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          measurements: Json
          updated_at?: string
          user_uid: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          measurements?: Json
          updated_at?: string
          user_uid?: string
        }
        Relationships: []
      }
      user_sizebook: {
        Row: {
          created_at: string
          fit_preference: string | null
          gender: string | null
          height_cm: number | null
          id: string
          measurements: Json
          updated_at: string
          user_uid: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          fit_preference?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          measurements?: Json
          updated_at?: string
          user_uid: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          fit_preference?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          measurements?: Json
          updated_at?: string
          user_uid?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          firebase_uid: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          firebase_uid: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          firebase_uid?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      variant_attributes: {
        Row: {
          attribute_name: string
          attribute_value: string
          created_at: string
          display_order: number | null
          id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          attribute_name: string
          attribute_value: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          attribute_name?: string
          attribute_value?: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attributes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          position: number | null
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          position?: number | null
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          position?: number | null
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_variant_images_variant_id"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_media: {
        Row: {
          alt_text: string | null
          aspect_ratio: number | null
          cloudinary_public_id: string
          collection_id: string | null
          created_at: string
          height: number | null
          id: string
          is_active: boolean
          is_primary: boolean
          position: number
          resource_type: Database["public"]["Enums"]["media_resource_type"]
          updated_at: string
          variant_id: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          aspect_ratio?: number | null
          cloudinary_public_id: string
          collection_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          position?: number
          resource_type: Database["public"]["Enums"]["media_resource_type"]
          updated_at?: string
          variant_id: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          aspect_ratio?: number | null
          cloudinary_public_id?: string
          collection_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          position?: number
          resource_type?: Database["public"]["Enums"]["media_resource_type"]
          updated_at?: string
          variant_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_media_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "media_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_media_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          barcode: string | null
          color: string | null
          color_group_id: string | null
          cost_price: number | null
          created_at: string
          enabled: boolean
          id: string
          images: Json | null
          low_stock_threshold: number | null
          position: number
          price_override: number | null
          product_id: string
          size: string | null
          sku: string
          stock_quantity: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          color_group_id?: string | null
          cost_price?: number | null
          created_at?: string
          enabled?: boolean
          id?: string
          images?: Json | null
          low_stock_threshold?: number | null
          position?: number
          price_override?: number | null
          product_id: string
          size?: string | null
          sku: string
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          color?: string | null
          color_group_id?: string | null
          cost_price?: number | null
          created_at?: string
          enabled?: boolean
          id?: string
          images?: Json | null
          low_stock_threshold?: number | null
          position?: number
          price_override?: number | null
          product_id?: string
          size?: string | null
          sku?: string
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_variants_color_group_id"
            columns: ["color_group_id"]
            isOneToOne: false
            referencedRelation: "color_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_ranking_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_trending_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          received_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          payload: Json
          received_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      abandoned_checkout_analytics: {
        Row: {
          date: string | null
          recovery_rate: number | null
          total_abandoned: number | null
          total_abandoned_amount: number | null
          total_recovered: number | null
          total_recovered_amount: number | null
        }
        Relationships: []
      }
      dispute_analytics: {
        Row: {
          date: string | null
          disputes_lost: number | null
          disputes_won: number | null
          total_disputed_amount: number | null
          total_disputes: number | null
        }
        Relationships: []
      }
      product_ranking_view: {
        Row: {
          add_to_cart_count: number | null
          bestseller_boost: number | null
          cart_score: number | null
          category_id: string | null
          conversion_rate: number | null
          last_updated: string | null
          name: string | null
          product_id: string | null
          purchase_count: number | null
          ranking_score: number | null
          rating_score: number | null
          recency_decay_boost: number | null
          stock_score: number | null
          unique_session_views: number | null
          unique_user_views: number | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_trending_view: {
        Row: {
          base_price: number | null
          category_id: string | null
          image_url: string | null
          last_updated: string | null
          name: string | null
          product_id: string | null
          rating: number | null
          total_orders: number | null
          trending_rank: number | null
          views_last_24h: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_analytics: {
        Row: {
          date: string | null
          refunds_failed: number | null
          refunds_processed: number | null
          total_refunded_amount: number | null
          total_refunds: number | null
        }
        Relationships: []
      }
      search_top_queries: {
        Row: {
          search_count: number | null
          search_query: string | null
          total_results: number | null
          zero_results: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_stock:
        | { Args: { p_delta: number; p_variant_id: string }; Returns: Json }
        | {
            Args: { p_delta: number; p_reason?: string; p_variant_id: string }
            Returns: Json
          }
      aggregate_product_analytics: {
        Args: never
        Returns: {
          aggregated_count: number
          last_updated: string
        }[]
      }
      commit_reservation: { Args: { p_order_id: string }; Returns: Json }
      create_order_items_snapshot: {
        Args: { p_order_id: string; p_uid: string }
        Returns: Json
      }
      create_ranking_snapshot: {
        Args: never
        Returns: {
          created_at: string
          snapshot_id: string
          total_products: number
        }[]
      }
      export_ranking_scores: {
        Args: { p_limit?: number; p_min_score?: number }
        Returns: {
          conversion_rate: number
          name: string
          product_id: string
          purchase_count: number
          ranking_score: number
          rating_score: number
          view_count: number
        }[]
      }
      get_category_hierarchy: {
        Args: never
        Returns: {
          full_path: string
          id: string
          level: number
          name: string
          parent_id: string
          slug: string
        }[]
      }
      get_frequently_bought_together: {
        Args: { p_limit?: number; p_product_id: string }
        Returns: {
          base_price: number
          frequency: number
          image_url: string
          name: string
          product_id: string
        }[]
      }
      get_product_detail: {
        Args: { p_product_id: string }
        Returns: {
          average_rating: number
          base_price: number
          category_id: string
          compare_price: number
          description: string
          id: string
          image_url: string
          images: Json
          name: string
          review_count: number
          slug: string
          status: string
          verified_purchases: number
        }[]
      }
      get_product_ranking_details: {
        Args: { p_product_id: string }
        Returns: {
          add_to_cart_count: number
          bestseller_boost: number
          cart_score: number
          conversion_rate: number
          name: string
          product_id: string
          purchase_count: number
          ranking_percentile: number
          ranking_score: number
          rating_score: number
          recency_decay_boost: number
          stock_score: number
          unique_session_views: number
          unique_user_views: number
          updated_at: string
          view_count: number
        }[]
      }
      get_product_stock_flags: {
        Args: { product_ids: string[] }
        Returns: {
          has_stock: boolean
          is_out_of_stock: boolean
          product_id: string
        }[]
      }
      get_ranked_products_by_category: {
        Args: {
          p_category_id: string
          p_limit?: number
          p_offset?: number
          p_sort_by?: string
        }
        Returns: {
          base_price: number
          image_url: string
          name: string
          product_id: string
          ranking_score: number
          rating: number
          review_count: number
          slug: string
        }[]
      }
      get_ranking_statistics: {
        Args: never
        Returns: {
          avg_conversion_rate: number
          avg_ranking_score: number
          last_refresh: string
          max_ranking_score: number
          min_ranking_score: number
          products_with_sales: number
          products_with_views: number
          total_products: number
        }[]
      }
      get_rating_distribution: {
        Args: { p_product_id: string }
        Returns: {
          count: number
          percentage: number
          rating: number
        }[]
      }
      get_recently_viewed: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          base_price: number
          image_url: string
          name: string
          product_id: string
          slug: string
          viewed_at: string
        }[]
      }
      get_similar_products: {
        Args: { p_category_id: string; p_limit?: number; p_product_id: string }
        Returns: {
          average_rating: number
          base_price: number
          id: string
          image_url: string
          name: string
          review_count: number
          slug: string
        }[]
      }
      get_sizebook_completeness: {
        Args: { p_user_uid: string }
        Returns: {
          completion_pct: number
          filled_fields: number
          total_fields: number
        }[]
      }
      get_trending_products: {
        Args: { p_category_id?: string; p_limit?: number }
        Returns: {
          base_price: number
          image_url: string
          name: string
          product_id: string
          rating: number
          slug: string
          trending_rank: number
          views_24h: number
        }[]
      }
      get_variant_availability: {
        Args: { variant_ids: string[] }
        Returns: {
          available_to_sell: number
          is_out_of_stock: boolean
          reserved_quantity: number
          stock_quantity: number
          variant_id: string
        }[]
      }
      jsonb_object_keys_count: { Args: { obj: Json }; Returns: number }
      log_product_view: {
        Args: { p_product_id: string; p_session_id?: string; p_user_id: string }
        Returns: string
      }
      match_ai_product_memory: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          ai_output: Json
          attributes: Json
          id: string
          image_description: string
          similarity: number
          title: string
        }[]
      }
      refresh_product_ranking_scores: {
        Args: never
        Returns: {
          last_updated: string
          refreshed_count: number
        }[]
      }
      refresh_ranking_views: {
        Args: never
        Returns: {
          duration_ms: number
          refresh_status: string
          view_name: string
        }[]
      }
      release_expired_reservations: { Args: never; Returns: Json }
      release_reservation: { Args: { p_order_id: string }; Returns: Json }
      release_variant_stock_atomic: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: Json
      }
      reserve_stock:
        | {
            Args: {
              p_items: Json
              p_order_id: string
              p_ttl_seconds?: number
              p_uid: string
            }
            Returns: Json
          }
        | { Args: { p_qty: number; p_variant_id: string }; Returns: Json }
      reserve_variant_stock_atomic: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: Json
      }
      search_products_by_embedding: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          base_price: number
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          in_stock: boolean
          similarity: number
          slug: string
          title: string
        }[]
      }
      search_products_with_ranking: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_query: string
        }
        Returns: {
          base_price: number
          image_url: string
          name: string
          product_id: string
          ranking_score: number
          rating: number
          review_count: number
          search_rank: number
          slug: string
        }[]
      }
      update_frequently_bought_together: {
        Args: never
        Returns: {
          processed_count: number
        }[]
      }
      validate_size_chart_measurements: {
        Args: { measurements: Json }
        Returns: boolean
      }
      validate_sizebook_measurements: {
        Args: { measurements: Json }
        Returns: boolean
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed_amount" | "free_shipping"
      homepage_section_type:
        | "hero"
        | "banner"
        | "category_grid"
        | "product_grid"
        | "product_slider"
        | "seasonal_highlight"
      media_collection_type: "gallery" | "spin360" | "video_set"
      media_resource_type: "image" | "video"
      order_status:
        | "CREATED"
        | "PAID"
        | "SENT_TO_PROVIDER"
        | "IN_PRODUCTION"
        | "SHIPPED"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
        | "REFUNDED"
      product_status: "draft" | "active" | "archived"
      refund_method: "ORIGINAL_PAYMENT" | "WALLET"
      return_reason:
        | "WRONG_SIZE"
        | "DAMAGED_PRODUCT"
        | "NOT_AS_EXPECTED"
        | "QUALITY_ISSUE"
        | "RECEIVED_WRONG_ITEM"
        | "OTHER"
      return_resolution: "REFUND" | "EXCHANGE" | "STORE_CREDIT"
      return_status:
        | "REQUESTED"
        | "APPROVED"
        | "PICKUP_SCHEDULED"
        | "IN_TRANSIT"
        | "INSPECTION_PENDING"
        | "REFUNDED"
        | "REJECTED"
      user_role: "customer" | "admin"
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
      discount_type: ["percentage", "fixed_amount", "free_shipping"],
      homepage_section_type: [
        "hero",
        "banner",
        "category_grid",
        "product_grid",
        "product_slider",
        "seasonal_highlight",
      ],
      media_collection_type: ["gallery", "spin360", "video_set"],
      media_resource_type: ["image", "video"],
      order_status: [
        "CREATED",
        "PAID",
        "SENT_TO_PROVIDER",
        "IN_PRODUCTION",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ],
      product_status: ["draft", "active", "archived"],
      refund_method: ["ORIGINAL_PAYMENT", "WALLET"],
      return_reason: [
        "WRONG_SIZE",
        "DAMAGED_PRODUCT",
        "NOT_AS_EXPECTED",
        "QUALITY_ISSUE",
        "RECEIVED_WRONG_ITEM",
        "OTHER",
      ],
      return_resolution: ["REFUND", "EXCHANGE", "STORE_CREDIT"],
      return_status: [
        "REQUESTED",
        "APPROVED",
        "PICKUP_SCHEDULED",
        "IN_TRANSIT",
        "INSPECTION_PENDING",
        "REFUNDED",
        "REJECTED",
      ],
      user_role: ["customer", "admin"],
    },
  },
} as const

