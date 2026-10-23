export interface Customer {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly document: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
}
