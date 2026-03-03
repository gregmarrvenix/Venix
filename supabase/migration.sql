-- Venix Time Tracker Database Schema

-- Contractors table
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_oid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, name)
);

-- Time entries table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  entry_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK(end_time > start_time)
);

-- Indexes
CREATE INDEX idx_time_entries_customer_date ON time_entries(customer_id, entry_date);
CREATE INDEX idx_time_entries_contractor ON time_entries(contractor_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Service role policies (all access via server-side API routes)
CREATE POLICY "Service role full access" ON contractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON time_entries FOR ALL USING (true) WITH CHECK (true);
