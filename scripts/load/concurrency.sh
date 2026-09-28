#!/usr/bin/env bash
# Concurrency / load test for the request state machine (Phase 4d).
#
# Runs real RPCs as real users in parallel psql sessions against a LOCAL
# Supabase database and checks that the business rules hold under races:
#   A. N donors accept the same request at once
#   B. 10 parallel confirmations of the same response → exactly 1 donation
#   C. donors accept two requests at once → never 2 active commitments (Q6)
#   D. 10 parallel "create request" for the same patient/day → exactly 1
#   E. 20 donors join a patient network at once → never above the limit
#
# Usage: npx supabase start && scripts/load/concurrency.sh [donors=30]
# Never point DB_URL at production: it creates and deletes test users.
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DONORS="${1:-30}"
PARALLEL="${PARALLEL:-30}"
PREFIX="10ad0000-0000-4000-8000"
GUARDIAN="${PREFIX}-000000000000"
FAILED=0

psql_q() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

# Runs one SQL statement as a signed-in user in its own session.
as_user() {
  local user="$1" sql="$2"
  { psql "$DB_URL" -X -q -At -c "set role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '$user', 'role', 'authenticated')::text, false);" -c "$sql" 2>&1 || true; } | grep -Ev '^(CONTEXT|DETAIL|HINT|LINE|PL/pgSQL|SQL statement)' | tail -n 1
}
export -f as_user
export DB_URL

donor_id() { printf '%s-%012d' "$PREFIX" "$1"; }
export -f donor_id
export PREFIX

check() {
  local name="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS  $name ($actual)"
  else
    echo "  FAIL  $name: expected $expected, got $actual"
    FAILED=1
  fi
}

cleanup() {
  psql_q <<SQL >/dev/null
set session_replication_role = replica; -- skip audit/cleanup triggers for test data
delete from public.donations where patient_id in (select patient_id from public.patient_managers where user_id = '$GUARDIAN');
delete from public.donor_responses where request_id in (select br.id from public.blood_requests br join public.patient_managers pm on pm.patient_id = br.patient_id where pm.user_id = '$GUARDIAN');
delete from public.blood_requests where patient_id in (select patient_id from public.patient_managers where user_id = '$GUARDIAN');
delete from public.patient_donor_connections where patient_id in (select patient_id from public.patient_managers where user_id = '$GUARDIAN');
delete from public.patients where id in (select patient_id from public.patient_managers where user_id = '$GUARDIAN');
delete from public.notifications where user_id::text like '$PREFIX-%';
delete from public.patient_managers where user_id::text like '$PREFIX-%';
delete from public.donor_profiles where user_id::text like '$PREFIX-%';
delete from public.user_roles where user_id::text like '$PREFIX-%';
delete from public.profiles where user_id::text like '$PREFIX-%';
delete from auth.users where id::text like '$PREFIX-%';
SQL
}
trap cleanup EXIT
cleanup

echo "Setting up 1 guardian, $DONORS donors ..."
psql_q -c "insert into auth.users (id, email) select ('$PREFIX-' || lpad(g::text, 12, '0'))::uuid, 'load' || g || '@load.local' from generate_series(0, $DONORS + 20) g;"
as_user "$GUARDIAN" "select public.complete_onboarding(array['guardian']::public.app_role[], 'Load Guardian', null, 1, null, 'bn', false);" >/dev/null
PATIENT=$(as_user "$GUARDIAN" "select id from public.create_patient(display_name => 'Load Patient', blood_group => 'O_POS', district_id => 1);")
CODE=$(as_user "$GUARDIAN" "select invite_code from public.patients where id = '$PATIENT';")
psql_q -c "update public.app_settings set value = '$((DONORS + 15))' where key = 'max_connected_donors';"

setup_donor() {
  local id; id=$(donor_id "$1")
  as_user "$id" "select public.complete_onboarding(array['donor']::public.app_role[], 'Donor $1', null, 1, null, 'bn', false);" >/dev/null
  as_user "$id" "select public.upsert_donor_profile(blood_group => 'O_POS');" >/dev/null
  as_user "$id" "select id from public.request_connection_by_code('$2');"
}
export -f setup_donor
seq 1 "$DONORS" | xargs -P "$PARALLEL" -I{} bash -c "setup_donor {} $CODE" >/dev/null
as_user "$GUARDIAN" "select count(public.respond_connection(c.id, true)) from public.patient_donor_connections c where c.patient_id = '$PATIENT' and c.status = 'requested';" >/dev/null

REQ1=$(as_user "$GUARDIAN" "select id from public.create_blood_request(patient_id => '$PATIENT', required_at => now() + interval '1 day', treating_centre => 'Load Centre', district_id => 1, units_needed => 2);")
REQ2=$(as_user "$GUARDIAN" "select id from public.create_blood_request(patient_id => '$PATIENT', required_at => now() + interval '2 days', treating_centre => 'Load Centre', district_id => 1, units_needed => 2);")
as_user "$GUARDIAN" "select status from public.publish_blood_request('$REQ1');" >/dev/null
as_user "$GUARDIAN" "select status from public.publish_blood_request('$REQ2');" >/dev/null

echo "A. $DONORS donors accept request 1 at the same time"
accept() {
  local id; id=$(donor_id "$1")
  as_user "$id" "select status from public.respond_to_request((select dr.id from public.donor_responses dr where dr.request_id = '$2' and dr.donor_id = '$id'), true);"
}
export -f accept
start=$(date +%s%N)
RESULTS_A=$(seq 1 "$DONORS" | xargs -P "$PARALLEL" -I{} bash -c "accept {} $REQ1")
ms=$(( ($(date +%s%N) - start) / 1000000 ))
check "all accepts succeed" "$(grep -c '^accepted$' <<<"$RESULTS_A")" "$DONORS"
check "request status" "$(psql_q -c "select status from public.blood_requests where id = '$REQ1';")" "responding"
echo "        $DONORS concurrent accepts in ${ms} ms"

echo "C. the same donors now try request 2 (they are committed to request 1)"
RESULTS_C=$(seq 1 "$DONORS" | xargs -P "$PARALLEL" -I{} bash -c "accept {} $REQ2")
check "no donor holds two active commitments" "$(psql_q -c "select count(*) from (select donor_id from public.donor_responses dr join public.patient_managers pm on true where pm.user_id = '$GUARDIAN' and dr.status in ('accepted', 'donation_pending') group by donor_id having count(*) > 1) x;")" "0"
check "all second accepts refused" "$(grep -c 'donor_has_active_commitment' <<<"$RESULTS_C" || true)" "$DONORS"
[[ $FAILED -ne 0 ]] && sort <<<"$RESULTS_C" | uniq -c | head -5

echo "C2. fresh donors accept requests 1 and 2 at the same instant"
for i in $(seq $((DONORS + 1)) $((DONORS + 10))); do
  setup_donor "$i" "$CODE" >/dev/null
done
as_user "$GUARDIAN" "select count(public.respond_connection(c.id, true)) from public.patient_donor_connections c where c.patient_id = '$PATIENT' and c.status = 'requested';" >/dev/null
psql_q -c "insert into public.donor_responses (request_id, donor_id, invited_via) select r, ('$PREFIX-' || lpad(g::text, 12, '0'))::uuid, 'regular' from generate_series($((DONORS + 1)), $((DONORS + 10))) g, unnest(array['$REQ1', '$REQ2']::uuid[]) r on conflict do nothing;"
RACE_JOBS=$(for i in $(seq $((DONORS + 1)) $((DONORS + 10))); do echo "$i $REQ1"; echo "$i $REQ2"; done)
xargs -P "$PARALLEL" -L 1 bash -c 'accept "$0" "$1"' <<<"$RACE_JOBS" >/dev/null
check "racing accepts never double-commit (Q6)" "$(psql_q -c "select count(*) from (select donor_id from public.donor_responses where request_id in ('$REQ1', '$REQ2') and status in ('accepted', 'donation_pending') group by donor_id having count(*) > 1) x;")" "0"

echo "B. 10 parallel confirmations of the same response"
RESP=$(psql_q -c "select id from public.donor_responses where request_id = '$REQ1' and status = 'accepted' limit 1;")
confirm() { as_user "$2" "select verification from public.confirm_donation('$1', current_date);"; }
export -f confirm
RESULTS_B=$(seq 1 10 | xargs -P 10 -I{} bash -c "confirm $RESP $GUARDIAN")
check "exactly one donation" "$(psql_q -c "select count(*) from public.donations where response_id = '$RESP';")" "1"
check "other attempts refused" "$(grep -c 'invalid_transition' <<<"$RESULTS_B")" "9"

echo "D. 10 parallel 'create request' for the same patient and day"
create() { as_user "$1" "select status from public.create_blood_request(patient_id => '$2', required_at => (current_date + 5) + time '10:00', treating_centre => 'Load Centre', district_id => 1);"; }
export -f create
RESULTS_D=$(seq 1 10 | xargs -P 10 -I{} bash -c "create $GUARDIAN $PATIENT")
check "exactly one request created" "$(grep -c '^draft$' <<<"$RESULTS_D")" "1"
check "duplicates refused" "$(grep -c 'duplicate_request' <<<"$RESULTS_D")" "9"

echo "E. 20 donors join a network with 3 free places at the same time"
ACTIVE=$(psql_q -c "select count(*) from public.patient_donor_connections where patient_id = '$PATIENT' and status in ('requested', 'active', 'paused');")
LIMIT=$((ACTIVE + 3))
psql_q -c "update public.app_settings set value = '$LIMIT' where key = 'max_connected_donors';"
psql_q -c "insert into auth.users (id, email) select ('$PREFIX-9' || lpad(g::text, 11, '0'))::uuid, 'late' || g || '@load.local' from generate_series(1, 20) g;"
late_join() {
  local id; id=$(printf '%s-9%011d' "$PREFIX" "$1")
  as_user "$id" "select public.complete_onboarding(array['donor']::public.app_role[], 'Late $1', null, 1, null, 'bn', false);" >/dev/null
  as_user "$id" "select public.upsert_donor_profile(blood_group => 'O_POS');" >/dev/null
  as_user "$id" "select status from public.request_connection_by_code('$2');"
}
export -f late_join
RESULTS_E=$(seq 1 20 | xargs -P 20 -I{} bash -c "late_join {} $CODE")
check "network never exceeds the limit" "$(psql_q -c "select count(*) <= $LIMIT from public.patient_donor_connections where patient_id = '$PATIENT' and status in ('requested', 'active', 'paused');")" "t"
check "exactly 3 joined" "$(grep -c '^requested$' <<<"$RESULTS_E")" "3"

psql_q -c "update public.app_settings set value = '6' where key = 'max_connected_donors';"

if [[ $FAILED -ne 0 ]]; then
  echo "Some checks FAILED"
  exit 1
fi
echo "All concurrency checks passed"
