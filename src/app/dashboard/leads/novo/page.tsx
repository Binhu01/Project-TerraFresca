"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import LeadForm from "../_components/lead-form";
import { createLead, getPipelineAndStages } from "../actions";
import type { CreateLeadInput } from "../schemas";
import type { PipelineStage } from "@/types/crm";

export default function NovoLeadPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStages() {
      try {
        const result = await getPipelineAndStages();
        setStages(result.stages);
      } catch {
        // Error will surface when form tries to submit
      } finally {
        setLoading(false);
      }
    }
    loadStages();
  }, []);

  async function handleSubmit(data: CreateLeadInput) {
    const result = await createLead(data);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-nexora-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/leads"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Novo Lead
          </h1>
          <p className="mt-0.5 text-sm text-nexora-text-secondary">
            Preencha os dados para cadastrar um novo lead
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <LeadForm
          stages={stages}
          onSubmit={handleSubmit}
          submitLabel="Criar lead"
        />
      </div>
    </div>
  );
}