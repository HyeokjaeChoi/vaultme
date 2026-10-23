-- Anonymous installs (ARCHITECTURE.md#install-auth). Times are unix seconds.
CREATE TABLE installs (
  id           TEXT PRIMARY KEY,
  public_key   TEXT NOT NULL, -- base64url, uncompressed P-256 point
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;

-- Replay guard for signed requests. Rows are deleted lazily once expires_at has passed.
CREATE TABLE nonces (
  install_id TEXT NOT NULL REFERENCES installs (id) ON DELETE CASCADE,
  nonce      TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (install_id, nonce)
) STRICT;
