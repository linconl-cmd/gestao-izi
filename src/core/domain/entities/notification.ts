export type NotificationKind = "register_closed_open_orders" | "orders_expired" | (string & {});

export interface Notification {
  readonly id: string;
  readonly storeId: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string | null;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}
