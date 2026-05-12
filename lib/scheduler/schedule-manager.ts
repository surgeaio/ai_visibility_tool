/**
 * Placeholder for schedule CRUD (Sprint D). Implement DB-backed reads/writes against `prompt_schedules`.
 */
export class ScheduleManager {
  async listActive(): Promise<{ promptId: string; cronExpression: string | null }[]> {
    return [];
  }
}
