export interface Category {
  readonly id: string;
  readonly storeId: string;
  readonly parentId: string | null;
  readonly name: string;
}
