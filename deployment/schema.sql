-- schema.sql
-- PostgreSQL Multi-Tenant Database Schema for ChronoTrack (Civil Mantra)
-- Connects client companies, users, telemetry logs, rules, and audit logs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies / Tenants table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table (includes Admins, Team Leads, and Employees)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tl', 'employee')),
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    active_project VARCHAR(100),
    base_salary NUMERIC(12, 2) DEFAULT 0.00,
    benefits NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Archived', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Telemetry Logs table (Encrypted at rest)
CREATE TABLE telemetry_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_window TEXT NOT NULL, -- Encrypted via AES-256
    keystrokes TEXT NOT NULL,     -- Encrypted via AES-256
    mouse_movements TEXT NOT NULL, -- Encrypted via AES-256
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Productivity Rules table (Whitelist/Blacklist)
CREATE TABLE productivity_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('whitelist', 'blacklist')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_keyword UNIQUE (company_id, keyword)
);

-- 5. Immutable System Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimizations
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_telemetry_user ON telemetry_logs(user_id);
CREATE INDEX idx_telemetry_created ON telemetry_logs(created_at);
CREATE INDEX idx_rules_company ON productivity_rules(company_id);
CREATE INDEX idx_audit_company ON audit_logs(company_id);
