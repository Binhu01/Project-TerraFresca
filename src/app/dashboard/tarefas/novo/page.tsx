import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "../_components/task-form";
import { getActiveMembers } from "../actions";

export default async function NovaTarefaPage() {
  await headers();
  const members = await getActiveMembers();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/tarefas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para tarefas
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Nova tarefa</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Crie uma tarefa e atribua a um membro da equipe.
        </p>
      </div>

      <TaskForm members={members} />
    </div>
  );
}