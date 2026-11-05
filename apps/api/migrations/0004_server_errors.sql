-- One row per 5xx answer (Q69). The hourly cron counts the rows of the last hour and reports a spike to Sentry; rows older than a day are purged.
-- No address, install or path: only the time.
CREATE TABLE server_errors (
  at INTEGER NOT NULL
) STRICT;
CREATE INDEX server_errors_at ON server_errors (at);
