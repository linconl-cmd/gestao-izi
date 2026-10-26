import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/core/domain/entities/notification";
import type { NotificationRepository } from "@/core/domain/repositories/notification-repository";
import { toNotification } from "../mappers/mappers";
import type { NotificationRow } from "../types/rows";
import { assertNoError } from "./errors";

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listUnread(limit = 10): Promise<Notification[]> {
    const { data, error } = await this.db
      .from("notifications")
      .select("*")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<NotificationRow[]>();
    assertNoError(error);
    return (data ?? []).map(toNotification);
  }

  async markRead(ids?: string[]): Promise<void> {
    // O trigger do banco carimba read_by/read_at; o cliente só sinaliza a leitura.
    let q = this.db.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (ids && ids.length > 0) q = q.in("id", ids);
    const { error } = await q;
    assertNoError(error);
  }
}
