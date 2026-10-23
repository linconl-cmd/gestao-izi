export interface Store {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly document: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: Record<string, unknown>;
  readonly isActive: boolean;
  readonly createdAt: Date;
}
