import { ResultAsync } from "neverthrow";
import { api } from "@/lib/api";
import { DomainError } from "@/lib/domain-error";

export interface CronExecution {
  id: string;
  jobName: string;
  triggerType: "SCHEDULED" | "MANUAL";
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  liquidatedProcessed: number;
  activeProcessed: number;
  totalProcessed: number;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface TriggerClosingResponse {
  success: boolean;
  message: string;
  executionId: string;
  status: string;
  durationMs: number;
  liquidatedProcessed: number;
  activeProcessed: number;
  totalProcessed: number;
}

export interface TriggerDemoCleanupResponse {
  success: boolean;
  message: string;
  executionId: string;
  status: string;
  durationMs: number;
  loansDeleted: number;
  installmentsDeleted: number;
  expensesDeleted: number;
  totalProcessed: number;
}

export const cronService = {
  triggerDailyClosing(): ResultAsync<TriggerClosingResponse, DomainError> {
    return api.safe.post<TriggerClosingResponse>("/owner/cron/run-daily-closing", {});
  },

  triggerDemoCleanup(): ResultAsync<TriggerDemoCleanupResponse, DomainError> {
    return api.safe.post<TriggerDemoCleanupResponse>("/owner/cron/run-demo-cleanup", {});
  },

  getExecutions(limit = 30): ResultAsync<CronExecution[], DomainError> {
    return api.safe.get<CronExecution[]>(`/owner/cron/executions?limit=${limit}`);
  },
};

