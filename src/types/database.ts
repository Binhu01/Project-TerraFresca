export type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: "active" | "suspended";
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<Organization, "id" | "created_at" | "updated_at">
        >;
      };
      memberships: {
        Row: Membership;
        Insert: Omit<Membership, "id" | "created_at">;
        Update: Partial<Omit<Membership, "id" | "created_at">>;
      };
    };
  };
}