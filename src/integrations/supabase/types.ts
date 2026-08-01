export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      activity_history: {
        Row: {
          course_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          lesson_id: string | null;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          lesson_id?: string | null;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          lesson_id?: string | null;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_history_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_history_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          messages: Json;
          model: string | null;
          provider: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages?: Json;
          model?: string | null;
          provider?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages?: Json;
          model?: string | null;
          provider?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_prompts: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_favorite: boolean;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_favorite?: boolean;
          tags?: string[];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_favorite?: boolean;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          position: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          position?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          code: string;
          course_id: string;
          id: string;
          issued_at: string;
          pdf_url: string | null;
          user_id: string;
        };
        Insert: {
          code?: string;
          course_id: string;
          id?: string;
          issued_at?: string;
          pdf_url?: string | null;
          user_id: string;
        };
        Update: {
          code?: string;
          course_id?: string;
          id?: string;
          issued_at?: string;
          pdf_url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          course_id: string | null;
          created_at: string;
          id: string;
          lesson_id: string | null;
          parent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category_id: string | null;
          cover_url: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          instructor_id: string | null;
          is_featured: boolean;
          language: string;
          level: Database["public"]["Enums"]["course_level"];
          price_cents: number;
          progression_mode: "FREE" | "LINEAR" | "FLEXIBLE";
          promo_video_url: string | null;
          published_at: string | null;
          rating: number;
          ratings_count: number;
          requirements: string[];
          slug: string;
          status: Database["public"]["Enums"]["course_status"];
          students_count: number;
          subtitle: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          what_you_learn: string[];
        };
        Insert: {
          category_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          instructor_id?: string | null;
          is_featured?: boolean;
          language?: string;
          level?: Database["public"]["Enums"]["course_level"];
          price_cents?: number;
          progression_mode?: "FREE" | "LINEAR" | "FLEXIBLE";
          promo_video_url?: string | null;
          published_at?: string | null;
          rating?: number;
          ratings_count?: number;
          requirements?: string[];
          slug: string;
          status?: Database["public"]["Enums"]["course_status"];
          students_count?: number;
          subtitle?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          what_you_learn?: string[];
        };
        Update: {
          category_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          instructor_id?: string | null;
          is_featured?: boolean;
          language?: string;
          level?: Database["public"]["Enums"]["course_level"];
          price_cents?: number;
          progression_mode?: "FREE" | "LINEAR" | "FLEXIBLE";
          promo_video_url?: string | null;
          published_at?: string | null;
          rating?: number;
          ratings_count?: number;
          requirements?: string[];
          slug?: string;
          status?: Database["public"]["Enums"]["course_status"];
          students_count?: number;
          subtitle?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          what_you_learn?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "instructors";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          created_at: string;
          enrolled_at: string;
          id: string;
          last_lesson_id: string | null;
          progress_percent: number;
          status: Database["public"]["Enums"]["enrollment_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          enrolled_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          progress_percent?: number;
          status?: Database["public"]["Enums"]["enrollment_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          enrolled_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          progress_percent?: number;
          status?: Database["public"]["Enums"]["enrollment_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey";
            columns: ["last_lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: string;
          course_id: string | null;
          created_at: string;
          id: string;
          position: number;
          question: string;
        };
        Insert: {
          answer: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          question: string;
        };
        Update: {
          answer?: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          question?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      instructors: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          links: Json;
          name: string;
          specialties: string[];
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          links?: Json;
          name: string;
          specialties?: string[];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          links?: Json;
          name?: string;
          specialties?: string[];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          course_id: string;
          created_at: string;
          id: string;
          last_position: number;
          last_position_seconds: number;
          lesson_id: string;
          progress_percent: number;
          seconds_spent: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["progress_status"];
          time_spent_seconds: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          last_position?: number;
          last_position_seconds?: number;
          lesson_id: string;
          progress_percent?: number;
          seconds_spent?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["progress_status"];
          time_spent_seconds?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          last_position?: number;
          last_position_seconds?: number;
          lesson_id?: string;
          progress_percent?: number;
          seconds_spent?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["progress_status"];
          time_spent_seconds?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      module_progress: {
        Row: {
          completed_at: string | null;
          completed_lessons: number;
          course_id: string;
          created_at: string;
          id: string;
          module_id: string;
          percentage: number;
          total_lessons: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_lessons?: number;
          course_id: string;
          created_at?: string;
          id?: string;
          module_id: string;
          percentage?: number;
          total_lessons?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_lessons?: number;
          course_id?: string;
          created_at?: string;
          id?: string;
          module_id?: string;
          percentage?: number;
          total_lessons?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "module_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "module_progress_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      course_progress: {
        Row: {
          completed_at: string | null;
          completed_lessons: number;
          completed_modules: number;
          course_id: string;
          created_at: string;
          id: string;
          last_lesson_id: string | null;
          percentage: number;
          total_lessons: number;
          total_modules: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_lessons?: number;
          completed_modules?: number;
          course_id: string;
          created_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          percentage?: number;
          total_lessons?: number;
          total_modules?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_lessons?: number;
          completed_modules?: number;
          course_id?: string;
          created_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          percentage?: number;
          total_lessons?: number;
          total_modules?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_progress_last_lesson_id_fkey";
            columns: ["last_lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_events: {
        Row: {
          course_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          lesson_id: string | null;
          metadata: Json;
          module_id: string | null;
          user_id: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          lesson_id?: string | null;
          metadata?: Json;
          module_id?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          lesson_id?: string | null;
          metadata?: Json;
          module_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_events_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_events_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_events_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_blocks: {
        Row: {
          content_json: Json;
          created_at: string;
          id: string;
          lesson_id: string;
          position: number;
          settings_json: Json;
          type: string;
          updated_at: string;
        };
        Insert: {
          content_json?: Json;
          created_at?: string;
          id?: string;
          lesson_id: string;
          position?: number;
          settings_json?: Json;
          type: string;
          updated_at?: string;
        };
        Update: {
          content_json?: Json;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          position?: number;
          settings_json?: Json;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          content: Json;
          content_text: string | null;
          course_id: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          is_free_preview: boolean;
          module_id: string;
          position: number;
          slug: string;
          status: Database["public"]["Enums"]["lesson_status"];
          summary: string | null;
          title: string;
          type: Database["public"]["Enums"]["lesson_type"];
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          content?: Json;
          content_text?: string | null;
          course_id: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          is_free_preview?: boolean;
          module_id: string;
          position?: number;
          slug: string;
          status?: Database["public"]["Enums"]["lesson_status"];
          summary?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["lesson_type"];
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          content?: Json;
          content_text?: string | null;
          course_id?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          is_free_preview?: boolean;
          module_id?: string;
          position?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["lesson_status"];
          summary?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["lesson_type"];
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          position: number;
          status: Database["public"]["Enums"]["lesson_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["lesson_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["lesson_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          daily_goal_minutes: number;
          full_name: string | null;
          headline: string | null;
          id: string;
          last_activity_date: string | null;
          streak_days: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          daily_goal_minutes?: number;
          full_name?: string | null;
          headline?: string | null;
          id: string;
          last_activity_date?: string | null;
          streak_days?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          daily_goal_minutes?: number;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          last_activity_date?: string | null;
          streak_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id: string;
          score?: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_options: {
        Row: {
          id: string;
          is_correct: boolean;
          label: string;
          match_key: string | null;
          position: number;
          question_id: string;
        };
        Insert: {
          id?: string;
          is_correct?: boolean;
          label: string;
          match_key?: string | null;
          position?: number;
          question_id: string;
        };
        Update: {
          id?: string;
          is_correct?: boolean;
          label?: string;
          match_key?: string | null;
          position?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          created_at: string;
          explanation: string | null;
          id: string;
          points: number;
          position: number;
          prompt: string;
          quiz_id: string;
          type: Database["public"]["Enums"]["question_type"];
        };
        Insert: {
          created_at?: string;
          explanation?: string | null;
          id?: string;
          points?: number;
          position?: number;
          prompt: string;
          quiz_id: string;
          type?: Database["public"]["Enums"]["question_type"];
        };
        Update: {
          created_at?: string;
          explanation?: string | null;
          id?: string;
          points?: number;
          position?: number;
          prompt?: string;
          quiz_id?: string;
          type?: Database["public"]["Enums"]["question_type"];
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          lesson_id: string | null;
          module_id: string | null;
          pass_score: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          lesson_id?: string | null;
          module_id?: string | null;
          pass_score?: number;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          lesson_id?: string | null;
          module_id?: string | null;
          pass_score?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          course_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          kind: string;
          lesson_id: string | null;
          position: number;
          size_bytes: number | null;
          title: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          kind?: string;
          lesson_id?: string | null;
          position?: number;
          size_bytes?: number | null;
          title: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          kind?: string;
          lesson_id?: string | null;
          position?: number;
          size_bytes?: number | null;
          title?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          body: string | null;
          course_id: string;
          created_at: string;
          id: string;
          rating: number;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          rating?: number;
          user_id: string;
        };
        Update: {
          body?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_cms_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_cms_recent_changes: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      duplicate_course_rpc: {
        Args: {
          p_course_id: string;
        };
        Returns: string;
      };
      reorder_items_rpc: {
        Args: {
          p_table_name: string;
          p_items: Json;
        };
        Returns: boolean;
      };
      reorder_lesson_blocks_rpc: {
        Args: {
          p_lesson_id: string;
          p_blocks: Json;
        };
        Returns: boolean;
      };
      update_lesson_progress_rpc: {
        Args: {
          p_lesson_id: string;
          p_course_id: string;
          p_completed?: boolean;
          p_status?: string;
          p_seconds_spent?: number;
          p_last_position?: number;
        };
        Returns: Json;
      };
      record_learning_event_rpc: {
        Args: {
          p_event_type: string;
          p_course_id?: string;
          p_module_id?: string;
          p_lesson_id?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "instructor" | "student";
      course_level: "beginner" | "intermediate" | "advanced";
      course_status: "draft" | "published" | "archived";
      enrollment_status: "active" | "completed" | "cancelled";
      lesson_status: "draft" | "published";
      lesson_type: "video" | "text" | "quiz" | "exercise" | "resource";
      progress_status: "not_started" | "in_progress" | "completed";
      question_type: "single" | "multiple" | "boolean" | "order" | "match" | "short";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "instructor", "student"],
      course_level: ["beginner", "intermediate", "advanced"],
      course_status: ["draft", "published", "archived"],
      enrollment_status: ["active", "completed", "cancelled"],
      lesson_status: ["draft", "published"],
      lesson_type: ["video", "text", "quiz", "exercise", "resource"],
      progress_status: ["not_started", "in_progress", "completed"],
      question_type: ["single", "multiple", "boolean", "order", "match", "short"],
    },
  },
} as const;
