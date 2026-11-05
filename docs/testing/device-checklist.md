# Device checklist

Manual check on a real iPhone and a real Android phone before a release. The Maestro flows (`docs/testing/e2e.md`) cover the simulator; this list covers what a simulator cannot show.
Use a Sepolia wallet with test funds only.

- [ ] Create: new wallet, the OS auth sheet (Face ID or fingerprint) appears, the phrase shows, the word check passes, Receive opens.
- [ ] Restore: restore a test wallet from its phrase; the first address matches the source wallet.
- [ ] Send: ETH to a second address; review shows account, network, asset, recipient, amount, fee; OS auth; the status moves Pending, Included, Confirmed.
- [ ] Receive: the address and QR match; a test deposit shows in Home and Activity.
- [ ] Push: turn on push; a test deposit sends a notification (the app was in the background); turn it off and no notification arrives.
- [ ] Lock: send the app to the background and open it again; the lock screen asks for OS auth; a failed attempt keeps it locked.
- [ ] Phrase view (Settings): needs OS auth; the screen cannot be captured.
