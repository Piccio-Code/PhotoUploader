export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
};

export type Photo = {
  id: number;
  path: string;
  default_path?: string;
  position: number;
  altText: string;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: number;
  name: string;
  photos?: Photo[];
  created_at: string;
  updated_at: string;
};

export type AppUser = {
  uid: string;
  email: string;
  photoUrl: string;
  role: "admin" | "editor" | "";
};
