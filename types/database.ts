export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Legacy role values (kept in DB for migration safety) */
export type RoleEnum = "MEDECIN" | "PSYCHOLOGUE" | "ORTHOPHONISTE" | "ADMINISTRATEUR" | "doctor" | "staff" | "admin";
/** Active role values used throughout the app */
export type AppRole = "doctor" | "admin";
/** Account approval status — pending until an admin approves */
export type AccountStatus = "pending" | "approved" | "rejected";
export type RisqueEnum = "FAIBLE" | "MODERE" | "ELEVE";
export type StatutEnum = "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "VALIDEE";
export type SexeEnum = "M" | "F" | "AUTRE";
export type ResultMode = "ai" | "questionnaire" | "combined";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          prenom: string | null;
          nom: string | null;
          numero_serie: string | null;
          role: AppRole | null;
          account_status: AccountStatus;
          email_verified: boolean;
          assigned_doctor_id: string | null;
          locale: "fr" | "en";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          prenom?: string | null;
          nom?: string | null;
          numero_serie?: string | null;
          role?: AppRole | null;
          account_status?: AccountStatus;
          email_verified?: boolean;
          assigned_doctor_id?: string | null;
          locale?: "fr" | "en";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      patients: {
        Row: {
          id: string;
          owner_id: string;
          code_anonymise: string;
          name: string | null;
          photo_url: string | null;
          age: number;
          sexe: SexeEnum;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          code_anonymise: string;
          name?: string | null;
          photo_url?: string | null;
          age: number;
          sexe: SexeEnum;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
      };
      evaluations: {
        Row: {
          id: string;
          patient_id: string;
          owner_id: string;
          statut: StatutEnum;
          niveau_risque: RisqueEnum | null;
          score_global: number | null;
          score_image: number | null;
          score_questionnaire: number | null;
          ml_prediction: string | null;
          ml_confidence: number | null;
          ml_model: string | null;
          commentaires: string | null;
          date_evaluation: string;
          created_at: string;
          result_mode: ResultMode | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          owner_id: string;
          statut?: StatutEnum;
          niveau_risque?: RisqueEnum | null;
          score_global?: number | null;
          score_image?: number | null;
          score_questionnaire?: number | null;
          ml_prediction?: string | null;
          ml_confidence?: number | null;
          ml_model?: string | null;
          commentaires?: string | null;
          date_evaluation?: string;
          created_at?: string;
          result_mode?: ResultMode | null;
        };
        Update: Partial<Database["public"]["Tables"]["evaluations"]["Insert"]>;
      };
      facial_images: {
        Row: {
          id: string;
          evaluation_id: string;
          storage_path: string;
          taille_octets: number;
          mime_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          storage_path: string;
          taille_octets: number;
          mime_type: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["facial_images"]["Insert"]>;
      };
      questionnaires: {
        Row: {
          id: string;
          evaluation_id: string;
          type_questionnaire: string;
          reponses: Json;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          type_questionnaire?: string;
          reponses: Json;
          score: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questionnaires"]["Insert"]>;
      };
      reports: {
        Row: {
          id: string;
          evaluation_id: string;
          report_type: "face" | "ai" | "questionnaire" | "combined";
          content: import("./report").ScreeningReport | null;
          storage_path: string | null;
          format_document: string;
          valide: boolean;
          generated_at: string;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          report_type?: "face" | "ai" | "questionnaire" | "combined";
          content?: import("./report").ScreeningReport | null;
          storage_path?: string | null;
          format_document?: string;
          valide?: boolean;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
      history: {
        Row: {
          id: string;
          patient_id: string | null;
          evaluation_id: string | null;
          actor_id: string;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          evaluation_id?: string | null;
          actor_id: string;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["history"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role_enum: RoleEnum;
      risque_enum: RisqueEnum;
      statut_enum: StatutEnum;
      sexe_enum: SexeEnum;
    };
  };
}
