import type { Notification } from "../entities/notification";

export interface NotificationRepository {
  listUnread(limit?: number): Promise<Notification[]>;
  /** Sem `ids`, marca todas as não lidas. O banco registra quem leu e quando. */
  markRead(ids?: string[]): Promise<void>;
}
