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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cierres: {
        Row: {
          caja_final: number | null
          caja_inicial: number | null
          cerrado: boolean
          created_at: string
          diferencia_caja: number | null
          efectivo_esperado: number | null
          fecha: string
          ganancia_neta: number
          id: string
          notas: string | null
          reabierto_en: string | null
          reabierto_por: string | null
          retiro: number | null
          total_gastos: number
          total_ventas: number
          totales_por_medio: Json
          updated_at: string
        }
        Insert: {
          caja_final?: number | null
          caja_inicial?: number | null
          cerrado?: boolean
          created_at?: string
          diferencia_caja?: number | null
          efectivo_esperado?: number | null
          fecha: string
          ganancia_neta?: number
          id?: string
          notas?: string | null
          reabierto_en?: string | null
          reabierto_por?: string | null
          retiro?: number | null
          total_gastos?: number
          total_ventas?: number
          totales_por_medio?: Json
          updated_at?: string
        }
        Update: {
          caja_final?: number | null
          caja_inicial?: number | null
          cerrado?: boolean
          created_at?: string
          diferencia_caja?: number | null
          efectivo_esperado?: number | null
          fecha?: string
          ganancia_neta?: number
          id?: string
          notas?: string | null
          reabierto_en?: string | null
          reabierto_por?: string | null
          retiro?: number | null
          total_gastos?: number
          total_ventas?: number
          totales_por_medio?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cierres_reabierto_por_fkey"
            columns: ["reabierto_por"]
            isOneToOne: false
            referencedRelation: "usuarios_caja"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          notas: string | null
          owner_id: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          notas?: string | null
          owner_id: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          owner_id?: string
          telefono?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          created_at: string
          descripcion: string
          fecha: string
          id: string
          monto: number
        }
        Insert: {
          created_at?: string
          descripcion: string
          fecha?: string
          id?: string
          monto: number
        }
        Update: {
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
        }
        Relationships: []
      }
      marcas: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      medios_pago: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          cliente_id: string
          created_at: string | null
          debe: number
          fecha: string
          haber: number
          id: string
          referencia: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          debe?: number
          fecha?: string
          haber?: number
          id?: string
          referencia?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          debe?: number
          fecha?: string
          haber?: number
          id?: string
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_caja: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          medio_pago: string
          medio_pago_2: string | null
          monto: number
          monto_2: number | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          medio_pago: string
          medio_pago_2?: string | null
          monto: number
          monto_2?: number | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          medio_pago?: string
          medio_pago_2?: string | null
          monto?: number
          monto_2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_medio_pago_2_fkey"
            columns: ["medio_pago_2"]
            isOneToOne: false
            referencedRelation: "medios_pago"
            referencedColumns: ["nombre"]
          },
          {
            foreignKeyName: "ventas_medio_pago_fkey"
            columns: ["medio_pago"]
            isOneToOne: false
            referencedRelation: "medios_pago"
            referencedColumns: ["nombre"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_dia: {
        Args: { p_caja_inicial: number; p_fecha: string }
        Returns: {
          caja_final: number | null
          caja_inicial: number | null
          cerrado: boolean
          created_at: string
          diferencia_caja: number | null
          efectivo_esperado: number | null
          fecha: string
          ganancia_neta: number
          id: string
          notas: string | null
          reabierto_en: string | null
          reabierto_por: string | null
          retiro: number | null
          total_gastos: number
          total_ventas: number
          totales_por_medio: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cierres"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_dia: {
        Args: { p_caja_final: number; p_fecha: string; p_retiro: number }
        Returns: {
          caja_final: number | null
          caja_inicial: number | null
          cerrado: boolean
          created_at: string
          diferencia_caja: number | null
          efectivo_esperado: number | null
          fecha: string
          ganancia_neta: number
          id: string
          notas: string | null
          reabierto_en: string | null
          reabierto_por: string | null
          retiro: number | null
          total_gastos: number
          total_ventas: number
          totales_por_medio: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cierres"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_usuario_caja: { Args: { uid: string }; Returns: boolean }
      reabrir_dia: {
        Args: { p_fecha: string }
        Returns: {
          caja_final: number | null
          caja_inicial: number | null
          cerrado: boolean
          created_at: string
          diferencia_caja: number | null
          efectivo_esperado: number | null
          fecha: string
          ganancia_neta: number
          id: string
          notas: string | null
          reabierto_en: string | null
          reabierto_por: string | null
          retiro: number | null
          total_gastos: number
          total_ventas: number
          totales_por_medio: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cierres"
          isOneToOne: true
          isSetofReturn: false
        }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
