"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================================================
// LANDING PAGE DATA — Dados dinâmicos do Supabase para a landing page
// =============================================================================

export async function getLandingData() {
  const supabase = await createClient();

  // Buscar a primeira organização ativa (barbearia principal)
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .limit(1)
    .single();

  if (!org) {
    return { barbers: [], services: [], products: [], settings: null };
  }

  // Buscar membros ativos primeiro (necessário para filtrar profissionais)
  const { data: activeMembers } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", org.id)
    .eq("status", "active");

  const activeUserIds = activeMembers?.map((m: { user_id: string }) => m.user_id) ?? [];

  // Buscar dados em paralelo
  const [barbersRes, servicesRes, productsRes, settingsRes] = await Promise.all([
    // Profissionais ativos (apenas se houver membros)
    activeUserIds.length > 0
      ? supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            avatar_url,
            phone,
            role,
            instagram
          `)
          .in("id", activeUserIds)
          .order("full_name")
      : Promise.resolve({ data: [], error: null }),

    // Serviços ativos
    supabase
      .from("barber_services")
      .select("id, name, description, price, duration_minutes, image_url")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name"),

    // Produtos ativos
    supabase
      .from("products")
      .select("id, name, description, price, image_url")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("name")
      .limit(8),

    // Configurações da barbearia
    supabase
      .from("barbershop_settings")
      .select("*")
      .eq("organization_id", org.id)
      .single(),
  ]);

  return {
    barbers: (barbersRes.data ?? []).map((b: any) => ({
      id: b.id,
      full_name: b.full_name,
      avatar_url: b.avatar_url,
      phone: b.phone,
      role: b.role ?? "Barbeiro",
      instagram: b.instagram ?? null,
    })),
    services: (servicesRes.data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      duration_minutes: s.duration_minutes,
      image_url: s.image_url ?? null,
    })),
    products: (productsRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      image_url: p.image_url ?? null,
    })),
    settings: settingsRes.data ?? null,
  };
}

// =============================================================================
// PUBLIC BOOKING — Agendamento público sem autenticação
// =============================================================================

export async function getAvailableSlotsForLanding(params: {
  serviceId: string;
  barberId?: string | null;
  date: string; // YYYY-MM-DD
}) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (!org) return { slots: [], error: "Organização não encontrada" };

  // Buscar duração do serviço
  const { data: service } = await supabase
    .from("barber_services")
    .select("duration_minutes")
    .eq("id", params.serviceId)
    .eq("organization_id", org.id)
    .single();

  if (!service) return { slots: [], error: "Serviço não encontrado" };

  // Se barberId fornecido, buscar slots específicos
  if (params.barberId) {
    const { data, error } = await supabase.rpc("get_public_available_slots", {
      p_org_id: org.id,
      p_barber_id: params.barberId,
      p_service_id: params.serviceId,
      p_date: params.date,
    });

    if (error) return { slots: [], error: error.message };
    return { slots: data ?? [], error: null };
  }

  // Sem barberId específico — buscar slots de qualquer profissional disponível
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", org.id)
    .eq("status", "active");

  if (!members || members.length === 0) {
    return { slots: [], error: "Nenhum profissional disponível" };
  }

  // Tentar cada profissional até encontrar slots disponíveis
  for (const member of members) {
    const { data, error } = await supabase.rpc("get_public_available_slots", {
      p_org_id: org.id,
      p_barber_id: member.user_id,
      p_service_id: params.serviceId,
      p_date: params.date,
    });

    if (!error && data && data.length > 0) {
      return { slots: data, barberId: member.user_id, error: null };
    }
  }

  return { slots: [], error: "Nenhum horário disponível nesta data" };
}

export async function createPublicBookingFromLanding(input: {
  serviceId: string;
  barberId?: string | null;
  date: string;
  timeSlot: string; // HH:MM
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1)
    .single();

  if (!org) throw new Error("Organização não encontrada");

  // Buscar serviço
  const { data: service } = await supabase
    .from("barber_services")
    .select("id, name, duration_minutes, price")
    .eq("id", input.serviceId)
    .eq("organization_id", org.id)
    .single();

  if (!service) throw new Error("Serviço não encontrado");

  // Construir datetime completo
  const scheduledAt = `${input.date}T${input.timeSlot}:00`;

  // Verificar disponibilidade final no backend (race condition protection)
  if (input.barberId) {
    const { data: availability } = await supabase.rpc("check_public_availability", {
      p_org_id: org.id,
      p_barber_id: input.barberId,
      p_start_time: scheduledAt,
      p_duration_minutes: service.duration_minutes,
    });

    if (!availability?.[0]?.is_available) {
      throw new Error("Este horário não está mais disponível. Por favor, escolha outro.");
    }
  }

  // Criar o agendamento
  const { data: booking, error } = await supabase
    .from("public_bookings")
    .insert({
      organization_id: org.id,
      barber_service_id: input.serviceId,
      assigned_barber_id: input.barberId ?? null,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? null,
      scheduled_at: scheduledAt,
      duration_minutes: service.duration_minutes,
      status: "confirmed",
      notes: input.notes ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);

  // Log de auditoria (best effort — não deve bloquear)
  try {
    await supabase.rpc("log_audit", {
      p_org_id: org.id,
      p_actor: null,
      p_action: "public_booking_created",
      p_module: "bookings",
      p_resource_type: "public_booking",
      p_resource_id: booking.id,
      p_metadata: {
        customer: input.customerName,
        service: service.name,
        date: scheduledAt,
      },
    });
  } catch {
    // Audit log failure should not block booking confirmation
  }

  return {
    bookingId: booking.id,
    serviceName: service.name,
    price: service.price,
    scheduledAt,
    durationMinutes: service.duration_minutes,
  };
}