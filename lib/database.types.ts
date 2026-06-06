export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ConversationStatus = 'open' | 'pending_human' | 'survey_pending' | 'survey_feedback_pending' | 'closed';
export type SurveyStatus = 'pending' | 'answered' | 'feedback_pending' | 'completed' | 'expired';
export type MessageSender = 'contact' | 'bot' | 'human' | 'system';
export type MessageDirection = 'inbound' | 'outbound';

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string; timezone: string; business_type: string | null; created_at: string | null };
        Insert: { id?: string; name: string; slug: string; timezone?: string; business_type?: string | null; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; organization_id: string; full_name: string | null; role: 'owner' | 'admin' | 'staff' | null; created_at: string | null };
        Insert: { id: string; organization_id: string; full_name?: string | null; role?: 'owner' | 'admin' | 'staff' | null; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      whatsapp_configs: {
        Row: { organization_id: string; phone_number_id: string; waba_id: string; access_token_encrypted: string; verify_token: string; app_secret_encrypted: string; webhook_enabled: boolean | null; last_test_at: string | null; updated_at: string | null };
        Insert: { organization_id: string; phone_number_id: string; waba_id: string; access_token_encrypted: string; verify_token: string; app_secret_encrypted: string; webhook_enabled?: boolean | null; last_test_at?: string | null; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['whatsapp_configs']['Insert']>;
        Relationships: [];
      };
      agent_configs: {
        Row: { organization_id: string; agent_name: string; agent_model: string; system_prompt: string; tone: string; business_info: Json; services: Json; products: Json; faqs: Json; policies: Json; business_hours: Json; handoff_message: string | null; fallback_message: string | null; bot_enabled_by_default: boolean | null; updated_at: string | null };
        Insert: { organization_id: string; agent_name?: string; agent_model?: string; system_prompt: string; tone?: string; business_info?: Json; services?: Json; products?: Json; faqs?: Json; policies?: Json; business_hours?: Json; handoff_message?: string | null; fallback_message?: string | null; bot_enabled_by_default?: boolean | null; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['agent_configs']['Insert']>;
        Relationships: [];
      };
      survey_configs: {
        Row: { organization_id: string; enabled: boolean | null; pre_close_question: string | null; resolution_question: string | null; positive_thanks_message: string | null; negative_feedback_question: string | null; negative_thanks_message: string | null; expired_message: string | null; timeout_minutes: number; updated_at: string | null };
        Insert: { organization_id: string; enabled?: boolean | null; pre_close_question?: string | null; resolution_question?: string | null; positive_thanks_message?: string | null; negative_feedback_question?: string | null; negative_thanks_message?: string | null; expired_message?: string | null; timeout_minutes?: number; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['survey_configs']['Insert']>;
        Relationships: [];
      };
      contacts: {
        Row: { id: string; organization_id: string; wa_phone: string; full_name: string | null; email: string | null; metadata: Json | null; tags: string[] | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; organization_id: string; wa_phone: string; full_name?: string | null; email?: string | null; metadata?: Json | null; tags?: string[] | null; created_at?: string | null; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: { id: string; organization_id: string; contact_id: string; bot_active: boolean | null; status: ConversationStatus | null; last_message_at: string | null; assigned_to: string | null; metadata: Json | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; organization_id: string; contact_id: string; bot_active?: boolean | null; status?: ConversationStatus | null; last_message_at?: string | null; assigned_to?: string | null; metadata?: Json | null; created_at?: string | null; updated_at?: string | null };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: { id: string; conversation_id: string; organization_id: string; wa_message_id: string | null; direction: MessageDirection; sender: MessageSender; content: string | null; message_type: string | null; raw: Json | null; created_at: string | null };
        Insert: { id?: string; conversation_id: string; organization_id: string; wa_message_id?: string | null; direction: MessageDirection; sender: MessageSender; content?: string | null; message_type?: string | null; raw?: Json | null; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      webhook_events: {
        Row: { id: string; organization_id: string | null; provider: string; external_event_id: string | null; event_type: string | null; payload: Json; status: 'pending' | 'processed' | 'failed' | 'ignored' | null; error: string | null; created_at: string | null; processed_at: string | null };
        Insert: { id?: string; organization_id?: string | null; provider: string; external_event_id?: string | null; event_type?: string | null; payload: Json; status?: 'pending' | 'processed' | 'failed' | 'ignored' | null; error?: string | null; created_at?: string | null; processed_at?: string | null };
        Update: Partial<Database['public']['Tables']['webhook_events']['Insert']>;
        Relationships: [];
      };
      human_handoffs: {
        Row: { id: string; organization_id: string; conversation_id: string; requested_by: 'customer' | 'bot' | 'human' | 'system' | null; reason: string | null; status: 'requested' | 'accepted' | 'resolved' | null; created_at: string | null; resolved_at: string | null };
        Insert: { id?: string; organization_id: string; conversation_id: string; requested_by?: 'customer' | 'bot' | 'human' | 'system' | null; reason?: string | null; status?: 'requested' | 'accepted' | 'resolved' | null; created_at?: string | null; resolved_at?: string | null };
        Update: Partial<Database['public']['Tables']['human_handoffs']['Insert']>;
        Relationships: [];
      };
      conversation_surveys: {
        Row: { id: string; organization_id: string; conversation_id: string; contact_id: string; triggered_by: 'bot' | 'human' | 'system'; survey_type: 'resolutividad' | 'nps' | null; question: string; response_raw: string | null; resolved: boolean | null; score: number | null; feedback: string | null; status: SurveyStatus | null; sent_at: string | null; answered_at: string | null; completed_at: string | null; expires_at: string | null; expired_at: string | null; created_at: string | null };
        Insert: { id?: string; organization_id: string; conversation_id: string; contact_id: string; triggered_by: 'bot' | 'human' | 'system'; survey_type?: 'resolutividad' | 'nps' | null; question?: string; response_raw?: string | null; resolved?: boolean | null; score?: number | null; feedback?: string | null; status?: SurveyStatus | null; sent_at?: string | null; answered_at?: string | null; completed_at?: string | null; expires_at?: string | null; expired_at?: string | null; created_at?: string | null };
        Update: Partial<Database['public']['Tables']['conversation_surveys']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_organization_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
