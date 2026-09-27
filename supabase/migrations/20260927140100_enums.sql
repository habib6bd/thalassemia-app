-- Phase 1a: enums (ARCHITECTURE.md §4).
create type public.app_role as enum ('patient', 'guardian', 'donor', 'organization', 'admin');
create type public.blood_group as enum ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');
create type public.manager_relation as enum ('self', 'guardian');
create type public.donor_availability as enum ('available', 'unavailable', 'paused');
create type public.connection_tier as enum ('regular', 'backup');
create type public.connection_status as enum ('requested', 'active', 'declined', 'cancelled', 'paused', 'removed');
create type public.connection_initiator as enum ('patient_side', 'donor');
create type public.request_status as enum ('draft', 'open', 'responding', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired');
create type public.request_tier as enum ('regular', 'backup', 'broad');
create type public.response_status as enum ('invited', 'accepted', 'declined', 'donation_pending', 'completed', 'cancelled', 'expired');
create type public.donation_verification as enum ('guardian_confirmed', 'org_verified');
create type public.contact_method as enum ('phone', 'whatsapp', 'in_app');
