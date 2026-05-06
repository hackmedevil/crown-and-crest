// Supabase Database Type Definitions
// Generated based on Enhanced Products System Migration

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          short_description: string | null
          description: string | null
          base_price: number
          cost_price: number | null
          mrp: number | null
          discount_engine_enabled: boolean
          discount_type: 'percentage' | 'fixed'
          discount_value: number | null
          selling_price: number | null
          fabric: string | null
          gsm: number | null
          fit_type: string | null
          print_type: string | null
          shipping_charge: number
          shipping_included_in_price: boolean
          category_id: string | null
          brand: string | null
          status: 'draft' | 'active' | 'archived'
          is_searchable: boolean
          enable_variant_image_switching: boolean
          tags: string[]
          seo_keywords: string[]
          hs_code: string | null
          country_of_origin: string | null
          ai_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          short_description?: string | null
          description?: string | null
          base_price: number
          cost_price?: number | null
          mrp?: number | null
          discount_engine_enabled?: boolean
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number | null
          selling_price?: number | null
          fabric?: string | null
          gsm?: number | null
          fit_type?: string | null
          print_type?: string | null
          shipping_charge?: number
          shipping_included_in_price?: boolean
          category_id?: string | null
          brand?: string | null
          status?: 'draft' | 'active' | 'archived'
          is_searchable?: boolean
          enable_variant_image_switching?: boolean
          tags?: string[]
          seo_keywords?: string[]
          hs_code?: string | null
          country_of_origin?: string | null
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          short_description?: string | null
          description?: string | null
          base_price?: number
          cost_price?: number | null
          mrp?: number | null
          discount_engine_enabled?: boolean
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number | null
          selling_price?: number | null
          fabric?: string | null
          gsm?: number | null
          fit_type?: string | null
          print_type?: string | null
          shipping_charge?: number
          shipping_included_in_price?: boolean
          category_id?: string | null
          brand?: string | null
          status?: 'draft' | 'active' | 'archived'
          is_searchable?: boolean
          enable_variant_image_switching?: boolean
          tags?: string[]
          seo_keywords?: string[]
          hs_code?: string | null
          country_of_origin?: string | null
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          size: string | null
          color: string | null
          images: Json | null
          price_override: number | null
          stock_quantity: number
          low_stock_threshold: number
          enabled: boolean
          position: number
          barcode: string | null
          cost_price: number | null
          weight_grams: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          size?: string | null
          color?: string | null
          images?: Json | null
          price_override?: number | null
          stock_quantity: number
          low_stock_threshold?: number
          enabled?: boolean
          position?: number
          barcode?: string | null
          cost_price?: number | null
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          size?: string | null
          color?: string | null
          images?: Json | null
          price_override?: number | null
          stock_quantity?: number
          low_stock_threshold?: number
          enabled?: boolean
          position?: number
          barcode?: string | null
          cost_price?: number | null
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'variants_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      product_embeddings: {
        Row: {
          id: string
          product_id: string
          embedding: string
          model_version: string
          generated_at: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          embedding: string
          model_version?: string
          generated_at?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          embedding?: string
          model_version?: string
          generated_at?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_embeddings_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      variant_attributes: {
        Row: {
          id: string
          variant_id: string
          attribute_name: string
          attribute_value: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          attribute_name: string
          attribute_value: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          attribute_name?: string
          attribute_value?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'variant_attributes_variant_id_fkey'
            columns: ['variant_id']
            referencedRelation: 'variants'
            referencedColumns: ['id']
          }
        ]
      }
      variant_images: {
        Row: {
          id: string
          variant_id: string
          image_url: string
          position: number
          is_primary: boolean
          alt_text: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          variant_id: string
          image_url: string
          position?: number
          is_primary?: boolean
          alt_text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          variant_id?: string
          image_url?: string
          position?: number
          is_primary?: boolean
          alt_text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_variant_images_variant_id'
            columns: ['variant_id']
            referencedRelation: 'variants'
            referencedColumns: ['id']
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          cloudinary_public_id: string
          cloudinary_version: string | null
          position: number
          alt_text: string | null
          is_primary: boolean
          width: number | null
          height: number | null
          format: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          cloudinary_public_id: string
          cloudinary_version?: string | null
          position?: number
          alt_text?: string | null
          is_primary?: boolean
          width?: number | null
          height?: number | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          cloudinary_public_id?: string
          cloudinary_version?: string | null
          position?: number
          alt_text?: string | null
          is_primary?: boolean
          width?: number | null
          height?: number | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_variant_stock_atomic: {
        Args: {
          p_variant_id: string
          p_quantity: number
        }
        Returns: Json
      }
      release_variant_stock_atomic: {
        Args: {
          p_variant_id: string
          p_quantity: number
        }
        Returns: Json
      }
    }
    Enums: {
      product_status: 'draft' | 'active' | 'archived'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
