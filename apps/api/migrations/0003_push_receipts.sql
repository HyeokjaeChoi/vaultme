-- Expo push receipt ids of accepted tickets (#314, Q39). The hourly cron fetches them 15+ minutes after the send,
-- deletes the subscription on DeviceNotRegistered (only while it still has this token), then deletes the checked ids. Purged after 7 days.
CREATE TABLE push_receipts (
  receipt_id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL,
  expo_token TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX push_receipts_created_at ON push_receipts (created_at);
