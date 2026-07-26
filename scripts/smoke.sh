#!/usr/bin/env bash
set -euo pipefail
BASE='http://localhost:3002'
TID=$(curl -sS "$BASE/api/tenants" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
echo tenant=$TID
curl -L -sS -o /tmp/sma.check.products -w 'products=%{http_code}\n' "$BASE/api/products?tenantId=$TID"
curl -L -sS -o /tmp/sma.check.analytics -w 'analytics=%{http_code}\n' "$BASE/api/analytics?tenantId=$TID"
curl -L -sS -o /tmp/sma.check.leads -w 'leads=%{http_code}\n' "$BASE/api/leads?tenantId=$TID"
curl -L -sS -o /tmp/sma.check.users -w 'users=%{http_code}\n' "$BASE/api/users?tenantId=$TID"
curl -L -sS -o /tmp/sma.check.adgen -w 'adgen=%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{"productName":"Test","productDescription":"Desc","targetAudience":"Audience","brandVoice":"Pro","psychologicalHook":"curiosity"}' "$BASE/api/generate-ad-from-theme"
curl -L -sS -o /tmp/sma.check.campaigns -w 'campaigns=%{http_code}\n' "$BASE/api/campaigns?tenantId=$TID"
curl -L -sS -o /tmp/sma.check.mcp -w 'mcp_status=%{http_code}\n' -H 'Authorization: Bearer __missing__' "$BASE/api/mcp/status"
