# Public tool counter API

## Contract

Both endpoints are public, under /api/v1/tools, and send Cache-Control: no-store. Responses use flat {ok,...} envelopes matching ERPCons.

POST /visits accepts a JSON object with tool matching /^[a-z0-9][a-z0-9-]{0,47}$/. Successful calls return HTTP 200 and {"ok":true}. Invalid JSON/body or tool returns HTTP 400 with {"ok":false,"message":"..."}; invalid tool also includes errors.tool. A rolling 120/hour/IP flood limit suppresses further increments while returning the same successful envelope.

GET /stats returns HTTP 200 and {"ok":true,"total":number,"tools":{"slug":number}}. total is the sum of all tool counts.

## Storage and integration

MySQL/InnoDB tables: tool_visits, visit_flood_locks and visit_flood_events. Counters use atomic SQL upserts. A database transaction and per-IP lock serialize flood checks across instances. IP addresses are HMAC hashed with VISIT_HASH_SECRET; expired flood records are cleaned periodically. The API receives only tool slugs.

The server defaults to 127.0.0.1:3003 and trusts only loopback proxy addresses. The independently deployed Next.js frontend configures its API proxy with BACKEND_URL. The two repositories share no source files or dependency links.

Tests use a dedicated qa slug and test IP, remove their own rows and verify malformed/empty JSON, invalid slugs, concurrent counting, proxy client IP, rolling limits and expiry.
