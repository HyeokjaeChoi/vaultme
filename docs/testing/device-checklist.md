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

## Screen reader run (Q76, owner only)

One recorded run before the first `v*` tag, with VoiceOver on a real iPhone and TalkBack on a real Android phone. The static check `apps/mobile/test/a11y-props.test.ts` (MOB-6) only proves that every control has a role and every input a label; it cannot hear them.
Record the date, device and OS for each of the 7 checks. 7 of 7 must pass on each platform.

- [ ] Focus order follows the reading order on Home, Send, Review and the phrase screen.
- [ ] Every control is announced with its role and its name.
- [ ] The phrase screen reads one word at a time, with its number.
- [ ] Text size 200 %: nothing is clipped on Home, Send and Review.
- [ ] Reduce Motion on: no animation stays on screen.
- [ ] Status changes (Pending, Included, Confirmed, Failed) are announced.
- [ ] An error under a field is announced when it appears.

| Platform | Date | Device | OS | Result |
|---|---|---|---|---|
| iOS | | | | |
| Android | | | | |

## Rooted device warning (SEC-8, ADR-0048)

- [ ] Rooted Android emulator (or a jailbroken iPhone): the first cold start opens "기기 보안 안내" once; the button closes it; the next start shows nothing; the app works as before.
- [ ] A normal phone: no warning appears.
