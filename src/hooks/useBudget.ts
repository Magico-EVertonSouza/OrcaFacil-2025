import { supabase } from "@/integrations/supabase/client";
import { ServiceCalculation } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/**
 * =========================================
 * TIPOS
 * =========================================
 */

export interface BudgetSummary {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetFull extends BudgetSummary {
  rooms: any[];
}

/**
 * =========================================
 * LISTAR ORÇAMENTOS
 * =========================================
 */
export const useListBudgets = () => {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async (): Promise<BudgetSummary[]> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("id, title, client_name, status, total_price, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Erro ao listar orçamentos:", error);
        throw error;
      }

      return data || [];
    },
  });
};

/**
 * =========================================
 * CARREGAR ORÇAMENTO COMPLETO
 * (RESTAURADO - necessário para página OrcamentosPage)
 * =========================================
 */
export const useLoadBudget = (budgetId: string | null) => {
  return useQuery({
    queryKey: ["budget", budgetId],
    enabled: !!budgetId,

    queryFn: async (): Promise<BudgetFull | null> => {
      if (!budgetId) return null;

      const { data: budget, error: bErr } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (bErr) {
        console.error("Erro budget:", bErr);
        throw bErr;
      }

      const { data: rooms, error: rErr } = await supabase
        .from("budget_rooms")
        .select("*")
        .eq("budget_id", budgetId);

      if (rErr) {
        console.error("Erro rooms:", rErr);
        throw rErr;
      }

      const { data: services } = await supabase
        .from("budget_services")
        .select("*");

      const { data: materials } = await supabase
        .from("budget_service_materials")
        .select("*");

      const roomsFull =
        rooms?.map((room) => ({
          ...room,
          services:
            services
              ?.filter((s) => s.room_id === room.id)
              .map((s) => ({
                ...s,
                materials:
                  materials?.filter(
                    (m) => m.budget_service_id === s.id
                  ) || [],
              })) || [],
        })) || [];

      return {
        ...budget,
        rooms: roomsFull,
      };
    },
  });
};

/**
 * =========================================
 * MUTAÇÕES
 * =========================================
 */
export const useBudgetMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * CRIAR ORÇAMENTO (LOGIN OPCIONAL)
   */
  const createBudget = async (
    title: string,
    clientName?: string
  ): Promise<string> => {
    const payload: any = {
      title,
      client_name: clientName || null,
      total_price: 0,
    };

    // login opcional
    if (user?.id) {
      payload.user_id = user.id;
    }

    console.log("📦 Criando orçamento:", payload);

    const { data, error } = await supabase
      .from("budgets")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("💥 Erro createBudget:", error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["budgets"] });

    return data.id;
  };

  /**
   * DELETAR
   */
  const deleteBudget = async (budgetId: string) => {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budgetId);

    if (error) {
      console.error("Erro delete:", error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  /**
   * SALVAR SERVIÇO
   */
  const saveServiceToBudget = async (
    budgetId: string,
    service: ServiceCalculation
  ) => {
    for (const room of service.rooms) {
      const { data: roomData } = await supabase
        .from("budget_rooms")
        .insert({
          budget_id: budgetId,
          name: room.name,
          sort_order: 0,
        })
        .select("id")
        .single();

      if (!roomData?.id) continue;

      const { data: svcData } = await supabase
        .from("budget_services")
        .insert({
          room_id: roomData.id,
          service_type_id: service.type,
          area: room.totalArea,
          width: service.width || 0,
          height: service.height || 0,
          total_price: room.totalPrice,
          walls_data: room.walls as any,
        })
        .select("id")
        .single();

      if (room.materials.length > 0 && svcData) {
        await supabase.from("budget_service_materials").insert(
          room.materials.map((m) => ({
            budget_service_id: svcData.id,
            material_name: m.name,
            quantity: m.quantity,
            unit: m.unit,
            price_per_unit: m.pricePerUnit,
            total_price: m.quantity * m.pricePerUnit,
          }))
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  return {
    createBudget,
    deleteBudget,
    saveServiceToBudget,
  };
};
