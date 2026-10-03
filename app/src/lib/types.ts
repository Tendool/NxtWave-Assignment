export type Registration = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  college: string;
  branch: string;
  year: string;
  ref_code: string;
  referred_by: string | null;
  source: string | null;
  created_at: string;
};

export type Evaluation = {
  id: string;
  ref_code: string | null;
  name: string;
  project_url: string;
  repo_url: string | null;
  description: string | null;
  scores: Record<string, number>;
  total: number;
  feedback: string;
  created_at: string;
};
