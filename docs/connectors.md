# Connectors reference: WHOOP and Strava

Researched 2026-10-29 from the official docs. Each fact cites its source page. **UNCONFIRMED** means the
official docs did not state it; **Inference** means it is our reasoning, not a documented rule.

---

## WHOOP (Developer Platform, API v2)

Sources used below:
- [oauth] https://developer.whoop.com/docs/developing/oauth
- [start] https://developer.whoop.com/docs/developing/getting-started
- [approval] https://developer.whoop.com/docs/developing/app-approval
- [api] https://developer.whoop.com/api
- [migrate] https://developer.whoop.com/docs/developing/v1-v2-migration
- [page] https://developer.whoop.com/docs/developing/pagination
- [rate] https://developer.whoop.com/docs/developing/rate-limiting
- [hooks] https://developer.whoop.com/docs/developing/webhooks
- [tos] https://developer.whoop.com/api-terms-of-use

### 1. App registration
- Apps are created in the WHOOP Developer Dashboard. You create a Team first, then use the App creation flow. Each app needs at least one scope and at least one redirect URL. Limit: 5 apps, with increases on request. [start]
- Other form fields (name, logo, contacts, privacy policy URL, webhook URL): **UNCONFIRMED**. The getting-started page does not list them.
- New apps start on the **Sandbox** tier, which allows up to 10 WHOOP members. "You can build and test on Sandbox without submitting a request." Higher tiers (Build 100, Growth 1k, Scale 5k, Production unlimited) need a manual review. [approval]
- For a single athlete, Sandbox is enough and no approval is needed. Personal use is not mentioned in the docs.

### 2. OAuth 2.0
- Authorize: `https://api.prod.whoop.com/oauth/oauth2/auth` [oauth]
- Token (code exchange and refresh): `https://api.prod.whoop.com/oauth/oauth2/token` [oauth]
- Scopes: `read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement` [api], plus **`offline`**. "You _must_ request the `offline` scope to receive a refresh token." [oauth]
- Access token lifetime: short. It is given in `expires_in`, and the example shows `3600` (1 h). [oauth]
- Refresh tokens **rotate**. A refresh invalidates the old access token and returns a new refresh token, which you must use next time. If two refreshes run at once, only the first succeeds. [oauth] We need a single-flight refresh lock and must persist the new token before using it.
- `state` is a CSRF safeguard and "must be eight characters long if you need to generate it yourself." [oauth]
- PKCE: **UNCONFIRMED** (not mentioned). Use a confidential client with client_secret.
- Revoke: `DELETE /v2/user/access`. [api]

### 3. Redirect URI rules
- The redirect URL must be registered in the dashboard and must match the one in the request. The examples are `https://...` and a custom scheme (`whoop://...`). [oauth][start]
- Whether HTTPS is required, whether `http://localhost` is allowed, and whether private hostnames are allowed: **UNCONFIRMED**. The docs only show https and custom-scheme examples.
- Inference: the redirect is followed by the user's browser and WHOOP never connects to it, so a private address (localhost, or a Tailscale `*.ts.net` HTTPS name) should work.

### 4. Endpoints (v2 is current)
Base URL: `https://api.prod.whoop.com/developer`. [api]
Version status: "The v1 API is no longer supported". New features go to v2 only. v1 webhooks "have been removed". No removal date is published. In v2, sleep and workout IDs are UUIDs (records carry `v1_id`). Cycle IDs are int64. [migrate][api]

Collection pagination (all list endpoints): `limit` (default 10, **max 25**), `start`, `end` (ISO date-time), `nextToken`. The response is `{records[], next_token}`, and you are done when `next_token` is empty. [api][page] Whether start/end are inclusive and how records are ordered: **UNCONFIRMED**. [page]

| Data | Endpoint | Scope | Key fields |
|---|---|---|---|
| Cycles (day strain) | `GET /v2/cycle`, `/v2/cycle/{cycleId}` | read:cycles | `id, start, end, timezone_offset, score_state`, `score.{strain, kilojoule, average_heart_rate, max_heart_rate}` |
| Recovery | `GET /v2/recovery`, `/v2/cycle/{cycleId}/recovery` | read:recovery | `cycle_id, sleep_id, score_state`, `score.{recovery_score, resting_heart_rate, hrv_rmssd_milli, spo2_percentage, skin_temp_celsius, user_calibrating}` |
| Sleep | `GET /v2/activity/sleep`, `/v2/activity/sleep/{uuid}`, `/v2/cycle/{cycleId}/sleep` | read:sleep | `id, cycle_id, nap, start, end`, `score.stage_summary.{total_in_bed/awake/no_data/light_sleep/slow_wave_sleep/rem_sleep_time_milli, sleep_cycle_count, disturbance_count}`, `score.sleep_needed.{baseline_milli, need_from_sleep_debt_milli, need_from_recent_strain_milli, need_from_recent_nap_milli}`, `score.{respiratory_rate, sleep_performance_percentage, sleep_consistency_percentage, sleep_efficiency_percentage}` |
| Workouts | `GET /v2/activity/workout`, `/v2/activity/workout/{uuid}` | read:workout | `id, sport_name, sport_id, start, end`, `score.{strain, average_heart_rate, max_heart_rate, kilojoule, percent_recorded, distance_meter, altitude_gain_meter, altitude_change_meter}`, `score.zone_durations.zone_{zero..five}_milli` |
| Profile | `GET /v2/user/profile/basic` | read:profile | `user_id, email, first_name, last_name` |
| Body | `GET /v2/user/measurement/body` | read:body_measurement | `height_meter, weight_kilogram, max_heart_rate` |

All of the above is from [api]. `score` is present only when `score_state` is `SCORED`. The other state values are **UNCONFIRMED** in what we read. Records can be rescored or updated after creation (`updated_at`, `*.updated` webhooks) [hooks], so the current cycle and the last few days need re-fetching.

### 5. Rate limits
100 requests/minute and 10,000/day by default, with increases on request. The headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` report usage. Exceeding a limit returns HTTP 429. [rate]

### 6. Webhooks
- The webhook URL is configured per app in the dashboard, with the model version set per URL (v2 is the default). WHOOP sends a POST over HTTPS with the body `{user_id, id, type, trace_id}`. In v2, `id` is a UUID, and recovery events reference the sleep UUID. [hooks]
- Event types: `workout.updated|deleted`, `sleep.updated|deleted`, `recovery.updated|deleted`. Creates arrive as `updated`. **There are no webhooks for cycles (day strain) or body measurements.** [hooks]
- Verification: compute HMAC-SHA256 of `X-WHOOP-Signature-Timestamp + raw body` with the client secret, Base64-encode it, and compare it to `X-WHOOP-Signature`. There is no subscribe handshake. WHOOP retries 5 times over about 1 hour on a non-2xx response or timeout. [hooks]
- Public reachability: not stated (**UNCONFIRMED**). Inference: WHOOP's servers make the POST, so the URL must be reachable from the internet. A tailnet-only URL will not receive events; it would need Funnel.
- Polling is a fine alternative, and it is required anyway for cycles. See Implications.

### 7. Terms relevant to local storage [tos]
- §4.2(2) forbids "build databases, or otherwise create permanent copies of WHOOP Data" and keeping cached copies "longer than permitted by the cache header". How this applies to a user's own data in a self-hosted app is **UNCONFIRMED**. The terms do not address personal use.
- §2.4 requires WHOOP Data to be "encrypted (in transit and at rest)". It also requires notifying WHOOP of a security incident within 48 h.
- §4.2(1) forbids exposing data to others without the user's opt-in. §4.2(3) forbids using WHOOP Data to "train, fine-tune or improve any large language model".
- §7.1 requires deleting stored content when API access ends.

---

## Strava (API v3)

Sources used below:
- [auth] https://developers.strava.com/docs/authentication/
- [gs] https://developers.strava.com/docs/getting-started/
- [docs] https://developers.strava.com/docs/
- [ref] https://developers.strava.com/docs/reference/
- [srate] https://developers.strava.com/docs/rate-limits/
- [shooks] https://developers.strava.com/docs/webhooks/
- [policy] https://www.strava.com/legal/api_policy (effective 2026-06-01)
- [agree] https://www.strava.com/legal/api (effective 2026-06-01)

### 1. App registration
- Log in, go to https://www.strava.com/settings/api, and create an app. The settings page shows Category, Club, Authorization Callback Domain, Client ID/Secret, and a sample access/refresh token. **"A Strava subscription is required"** to create an app. [gs]
- The other form fields (name, website, description, icon) are **UNCONFIRMED** (not listed on [gs]).
- New apps have athlete capacity 1 ("Single Player Mode"), meaning only your own account can authenticate. That fits a single-athlete install. Upgrading to 10 athletes is self-serve, and going beyond 10 requires review. [srate][gs]

### 2. OAuth 2.0
- Authorize: `GET https://www.strava.com/oauth/authorize` (params `client_id, redirect_uri, response_type=code, scope, approval_prompt=auto|force, state`). [auth]
- Token (exchange and refresh): `POST https://www.strava.com/oauth/token`. Revoke: `POST https://www.strava.com/oauth/revoke`. It becomes the only supported deauthorization endpoint on 2027-06-01, replacing the legacy `/oauth/deauthorize`. [auth]
- Scopes needed: `read,activity:read_all,profile:read_all`. `activity:read_all` includes Only-Me activities and privacy-zone data. `profile:read_all` is needed for `/athlete/zones` and a detailed athlete (bikes/shoes). [auth][ref]
- Access token lifetime: 6 h (`expires_in: 21600`). [auth]
- Refresh tokens **may rotate**. A refresh can return a new refresh token, and the old one then stops working. Always store the latest one. [auth]
- `state` is optional and is echoed back. Use it for CSRF. PKCE: **UNCONFIRMED** (not mentioned). [auth]

### 3. Redirect URI and "Authorization Callback Domain"
- `redirect_uri` "must be within the callback domain specified by the application". `localhost` and `127.0.0.1` are whitelisted. [auth] During development you can set the domain to "localhost or any domain", and "a real domain" when going live. [gs]
- Exactly what is compared (host only vs. scheme/port/path, subdomain matching) and whether HTTPS is required: **UNCONFIRMED** in the official docs. Common practice is to enter a bare host such as `your-mac.tailXXXX.ts.net`, with no scheme or path.
- Inference: Strava only validates the string and the browser performs the redirect, so a `*.ts.net` Tailscale host should also work.

### 4. Endpoints
Base URL `https://www.strava.com/api/v3`. Pagination is `page` (default 1) and `per_page` (default 30, **max 200** [docs]). [ref]
- `GET /athlete`: returns the logged-in athlete. With `profile:read_all` you get DetailedAthlete, including `bikes[]` and `shoes[]` (gear summaries). [ref]
- `GET /athlete/activities?after=<epoch>&before=<epoch>&page&per_page`: returns SummaryActivity[]. Scope is `activity:read`, or `_all` for Only-Me activities. [ref]
- `GET /activities/{id}?include_all_efforts=bool`: returns DetailedActivity. [ref]
  Key fields (from reference samples): `id, name, sport_type, type, start_date, start_date_local, timezone, distance` (m), `moving_time, elapsed_time` (s), `total_elevation_gain` (m), `average_speed, max_speed` (m/s), `has_heartrate, average_heartrate, max_heartrate, average_watts, kilojoules, calories, suffer_score, gear_id, device_name`. [ref] `calories` and `device_name` appear only in the detail sample. Whether list responses include them is **UNCONFIRMED**.
- `GET /gear/{id}`: returns DetailedGear `{id, primary, distance, brand_name, model_name, frame_type, description}`. [ref] `retired` is **UNCONFIRMED**.
- `GET /activities/{id}/streams?keys=time,heartrate,...&key_by_type=true`: stream names are `time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth`. [ref] Use this only if we want HR/pace curves. Each call costs one request.
- Also useful: `GET /athlete/zones` (profile:read_all) and `GET /athletes/{id}/stats` (Everyone-visibility activities only). [ref]

### 5. Rate limits [srate]
- Default overall: 200 requests/15 min and 2,000/day. Non-upload ("read"): **100/15 min and 1,000/day**.
- The 15-minute window resets at :00, :15, :30 and :45. The daily window resets at midnight UTC. Exceeding a limit returns HTTP 429. [docs]
- Headers: `X-RateLimit-Limit/Usage` and `X-ReadRateLimit-Limit/Usage`, each formatted as "15min,daily".
- The 10-athlete upgrade raises the limits to 200/15 min and 2,000/day (read) and 400/4,000 (overall).

### 6. Webhooks [shooks]
- There is one subscription per app. Create it with `POST /api/v3/push_subscriptions` (form-encoded `client_id, client_secret, callback_url, verify_token`).
- Handshake: Strava sends a GET to the callback with `hub.mode=subscribe`, `hub.challenge` and `hub.verify_token`. You must reply 200 with JSON `{"hub.challenge": "..."}` within **2 s**.
- Events are POSTed as `{object_type: activity|athlete, object_id, aspect_type: create|update|delete, updates, owner_id, subscription_id, event_time}`. You must ACK with 200 within 2 s, and Strava makes up to 3 attempts. Events carry only IDs, so you still fetch the activity afterwards. Activity events require `activity:read`.
- Reachability is not explicitly stated, but Strava's servers call the URL, so it **must be internet-reachable**. A tailnet-only URL fails, and Funnel would be needed.
- Polling is a reasonable alternative for one athlete. See Implications.

### 7. Terms relevant to local storage (important)
- **§6.2 [policy]: "You may not retain Strava Data in your cache for longer than seven (7) days."** Except for that limited caching, you may not store Strava Data. §5.5 also bans storing Strava data "or any data derived from" it in a Persistent Index. The policy has **no personal-use or single-player exception**. [policy]
- §2.3 [policy]: a user's data may be displayed "only to that user". That is fine for us.
- §5.3 [policy]: Strava data may not be used, "directly or indirectly", in any AI Application. This includes "ingestion into a context window", embeddings and RAG. The only carve-out is Strava's own MCP for personal use (§3.5). **Do not pipe Strava data into an LLM feature.**
- §7.4 [policy]: on deauthorization, delete the user's data within 30 days. §4.4 [agree]: on termination, delete all Strava Data.
- §6.6 [policy]: users can export their own data free via Strava's Bulk Data Export. That export is not API data, but whether importing it into our DB is covered by the API policy is **UNCONFIRMED** (it is likely outside the policy).

---

## How Halo Labs uses this

**Redirect URLs.** Halo Labs shows the exact redirect URL for each service in Settings → Sources (from `PUBLIC_URL` in
`.env`, default `http://localhost:8787`):
- WHOOP: register the full URL, `http://localhost:8787/oauth/whoop/callback`. WHOOP's docs don't confirm that `http://localhost`
  is accepted (**UNCONFIRMED**); if the dashboard refuses it, set up the Tailscale HTTPS address (README → Phone access)
  and register `https://<your-mac>.<tailnet>.ts.net/oauth/whoop/callback` instead.
- Strava: set the Authorization Callback Domain to `localhost` (officially whitelisted), or to your `*.ts.net` host name.
If you change `PUBLIC_URL` later, update the redirect URL in both dashboards and reconnect.

**Terms.** Halo Labs keeps WHOOP and Strava data in its encrypted database for good and lets the coach (Claude) read it.
WHOOP's §2.4 encryption requirement is met; Strava's API Policy (7-day retention, no AI use, §5.3/§6.2 above) is not. Using the
Strava connector is the athlete's own call; leaving it disconnected and uploading Strava's bulk export instead is the
alternative.

**Funnel.** Funnel is needed **only for webhooks**, for either service. It is not needed for OAuth or for polling. For one athlete, skip webhooks and Funnel entirely.

**WHOOP sync (polling).**
- Every 5 min while the newest cycle is under 14 h old (overnight and the morning, when recovery is scored and sometimes revised), every 15 min otherwise, and when the app is opened or brought back (`POST /api/refresh`, if the last sync is over 2 min old). Fetch `cycle`, `recovery`, `activity/sleep` and `activity/workout` with `start = now − 3 days` (to catch rescoring), `limit=25`, and follow `next_token`.
- A revised recovery score replaces the old one; the earlier value is kept in the cycle's encrypted `rescores` and shown under the Recovery dial ("revised from N%"), next to the last sync time.
- This costs about 5 requests per run, or under 1,500/day, well within 100/min and 10k/day.
- Do the historical backfill once, paging at 25 per page.
- Upsert by v2 ID and `updated_at`. Refresh tokens rotate, so serialize refresh and persist the new token atomically.
- Request `offline`.
- Encrypt the SQLite DB or the volume at rest (ToS §2.4). The §4.2 "permanent copies" clause is ambiguous for personal use.

**Strava sync (polling).**
- Every 30–60 min, fetch `/athlete/activities?after=<last_start_epoch − 1 day>&per_page=200`.
- Then fetch `GET /activities/{id}` for new or changed activities, and `/gear/{id}` occasionally.
- That totals about 50–100 read requests/day, well under 1,000/day (100 per 15 min).
- Fetch streams only on demand.
- **Policy conflict:** the API Policy limits retention of Strava data to 7 days, with no personal-use exception. That conflicts with a long-term training history in SQLite. Options:
  - (a) Treat Strava rows as a 7-day rolling cache and re-fetch history on demand within rate limits.
  - (b) Build long-term history from the athlete's own Strava Bulk Export (UNCONFIRMED that the policy doesn't apply).
  - (c) Use WHOOP workouts as the durable record.
- Also keep Strava data out of any LLM/AI feature (§5.3).
