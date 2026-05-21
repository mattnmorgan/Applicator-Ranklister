export interface Item {
  id: string;
  ranklistId: string;
  rankId: string | null;
  name: string;
  order: number;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
}
