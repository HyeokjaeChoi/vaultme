-- Transaction push (#67). One subscription per install. Deleted on switch-off, wallet removal and 30 days of inactivity.
CREATE TABLE push_subscriptions (
  install_id   TEXT PRIMARY KEY REFERENCES installs (id) ON DELETE CASCADE,
  address      TEXT NOT NULL, -- lowercase 0x address
  expo_token   TEXT NOT NULL,
  created_at   INTEGER NOT NULL
) STRICT;
CREATE INDEX push_subscriptions_address ON push_subscriptions (address);

-- Addresses still to remove from the Alchemy webhook. Written before the call, deleted after it succeeds, retried by cron.
CREATE TABLE push_unregister (
  address    TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
) STRICT;

-- Dedupe for Alchemy retries. ref = `<tx hash>:<log index or native>`. Rows are purged after 7 days.
CREATE TABLE push_sent (
  install_id TEXT NOT NULL,
  ref        TEXT NOT NULL,
  sent_at    INTEGER NOT NULL,
  PRIMARY KEY (install_id, ref)
) STRICT;
