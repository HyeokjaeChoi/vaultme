import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowUpRight,
  ArrowsLeftRight,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  ClipboardText,
  Clock,
  ClockCounterClockwise,
  Copy,
  DownloadSimple,
  Eye,
  EyeSlash,
  GearSix,
  House,
  Info,
  ListChecks,
  List,
  LockSimple,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  QrCode,
  Question,
  ShareNetwork,
  ShieldWarning,
  Wallet,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react"

import ethLogo from "./assets/coins/eth.svg"
import usdcLogo from "./assets/coins/usdc.svg"
import btcLogo from "./assets/coins/btc.svg"
import solLogo from "./assets/coins/sol.svg"
import xrpLogo from "./assets/coins/xrp.svg"
import trxLogo from "./assets/coins/trx.svg"
import usdtLogo from "./assets/coins/usdt.svg"
import {
  ASSETS,
  CHAINS,
  NOTICES,
  SEED_TXS,
  SWAP_UNSUPPORTED,
  assetOf,
  chainOf,
  feeFor,
  formatQty,
  formatUsd,
  shortAddress,
  validateAmount,
  validateRecipient,
  type Asset,
  type ChainId,
  type Tx,
  type TxStatus,
  type TxType,
} from "./wallet/data"

type Screen =
  | "onboarding"
  | "locked"
  | "home"
  | "asset"
  | "receive"
  | "send"
  | "review"
  | "swap"
  | "swap-review"
  | "activity"
  | "tx"
  | "settings"
type SimulationStatus = "ready" | "pending" | "confirmed"

const ACCOUNT_NAME = "Everyday vault"
const ACCOUNT_ADDRESS = CHAINS[0].address
const LARGE_AMOUNT_USD = 1000

const COIN_LOGOS: Record<string, string> = {
  ETH: ethLogo,
  USDC: usdcLogo,
  BTC: btcLogo,
  SOL: solLogo,
  XRP: xrpLogo,
  TRX: trxLogo,
  USDT: usdtLogo,
}

function AssetIcon({
  symbol,
  name,
  size = "md",
  decorative = false,
}: {
  symbol: string
  name: string
  size?: "md" | "lg"
  decorative?: boolean
}) {
  const src = COIN_LOGOS[symbol]
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `${name} logo` }

  if (!src) {
    return (
      <span className={`asset-fallback product-label coin-icon--${size}`} {...a11y}>
        {symbol.slice(0, 1)}
      </span>
    )
  }

  return (
    <span className={`coin-icon coin-icon--${size}`} {...a11y}>
      <img src={src} alt="" width={40} height={40} />
    </span>
  )
}

type SelectOption = { value: string; label: string; hint?: string; icon?: React.ReactNode }

function Select({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [up, setUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selected = options[selectedIndex]
  const listId = `${id}-list`

  const openList = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    setUp(rect ? window.innerHeight - rect.bottom < 280 && rect.top > window.innerHeight - rect.bottom : false)
    setActive(selectedIndex)
    setOpen(true)
  }

  const choose = (index: number) => {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    return () => document.removeEventListener("pointerdown", onPointer)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = options.length - 1
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        setActive((index) => Math.min(index + 1, last))
        break
      case "ArrowUp":
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
        break
      case "Home":
        event.preventDefault()
        setActive(0)
        break
      case "End":
        event.preventDefault()
        setActive(last)
        break
      case "Enter":
      case " ":
        event.preventDefault()
        choose(active)
        break
      case "Escape":
        event.preventDefault()
        setOpen(false)
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  return (
    <div className="select" ref={rootRef} data-open={open || undefined} data-up={up || undefined}>
      {/* using <button>: the kit ships no Select/Combobox; this trigger reuses the C03 field surface */}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="field__input select__trigger product-body"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected?.icon}
        <span className="select__value">{selected?.label}</span>
        {selected?.hint ? <span className="select__hint product-meta muted">{selected.hint}</span> : null}
        <CaretDown className="select__caret" weight="regular" aria-hidden="true" />
      </button>
      {open ? (
        <ul id={listId} ref={listRef} className="select__list" role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option, index) => (
            // using <li role=option>: listbox options are not a kit component; focus stays on the trigger via aria-activedescendant
            <li
              key={option.value}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active || undefined}
              className="select__option product-body"
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.icon}
              <span className="select__value">{option.label}</span>
              {option.hint ? <span className="select__hint product-meta muted">{option.hint}</span> : null}
              {option.value === value ? <Check className="select__check" weight="regular" aria-hidden="true" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  busy = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary"
  size?: "md" | "lg"
  block?: boolean
  busy?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`button button--${variant} ${size === "lg" ? "button--lg" : ""} ${
        block ? "button--block" : ""
      } product-label`}
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  )
}

function useCopy(onResult: (message: string) => void) {
  return async (text: string, label = "Address copied") => {
    try {
      await navigator.clipboard.writeText(text)
      onResult(label)
    } catch {
      onResult("Copy unavailable in this browser")
    }
  }
}

type NoticeTone = "info" | "warning" | "danger" | "confirmed" | "unknown"

const NOTICE_ICON = {
  info: Info,
  warning: Warning,
  danger: XCircle,
  confirmed: CheckCircle,
  unknown: Question,
}

function Notice({
  tone,
  title,
  children,
  live = false,
}: {
  tone: NoticeTone
  title: string
  children?: React.ReactNode
  live?: boolean
}) {
  const Icon = NOTICE_ICON[tone]
  return (
    <div
      className={`status-notice status-notice--${tone}`}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
    >
      <Icon className="icon-feature" weight="regular" aria-hidden="true" />
      <div className="status-notice__body">
        <p className="product-label">{title}</p>
        {children && <div className="product-body">{children}</div>}
      </div>
    </div>
  )
}

function Switch({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description?: string
  onChange: (value: boolean) => void
}) {
  const id = `switch-${label.replace(/\W+/g, "-").toLowerCase()}`
  return (
    <div className="setting-row">
      <span className="row-body">
        <strong id={id} className="product-row">
          {label}
        </strong>
        {description && <span className="product-body muted">{description}</span>}
      </span>
      {/* using <button role="switch">: the kit ships no Toggle component; C01 target/focus contract applies */}
      <button
        className="switch"
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" aria-hidden="true" />
      </button>
    </div>
  )
}

type OnboardingStep = "welcome" | "create" | "verify" | "import" | "lock"
export type OnboardingResult = { mode: "created" | "imported"; lock: boolean }

const WELCOME_POINTS = [
  {
    Icon: Wallet,
    title: "One home for your assets",
    body: "Ethereum, Bitcoin, Solana, Tron and XRP Ledger balances in a single place.",
  },
  {
    Icon: ListChecks,
    title: "Review before every send",
    body: "Account, network, full recipient, amount and estimated fee are shown first.",
  },
  {
    Icon: Info,
    title: "Prototype with synthetic data",
    body: "No wallet is connected and nothing is sent on a real network.",
  },
]

const SAMPLE_PHRASE = [
  "sample", "vault", "prototype", "test", "only", "synthetic",
  "words", "not", "real", "demo", "wallet", "example",
]

const VERIFY_POSITIONS = [2, 6, 10]

function verifyOptions(position: number) {
  const others = SAMPLE_PHRASE.filter((_, index) => index !== position)
  const picks = [others[(position * 3) % others.length], others[(position * 5 + 1) % others.length], others[(position + 4) % others.length]]
  const unique = Array.from(new Set(picks)).slice(0, 3)
  const options = [...unique, SAMPLE_PHRASE[position]]
  return options.sort((a, b) => ((a.charCodeAt(1) * position) % 7) - ((b.charCodeAt(1) * position) % 7))
}

function Onboarding({ onComplete }: { onComplete: (result: OnboardingResult) => void }) {
  const [picks, setPicks] = useState<Record<number, string>>({})
  const [lockChoice, setLockChoice] = useState(true)
  const [mode, setMode] = useState<"created" | "imported">("created")
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [words, setWords] = useState<string[]>(() => Array(24).fill(""))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [passphrase, setPassphrase] = useState("")
  const [masked, setMasked] = useState(true)
  const [passMasked, setPassMasked] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function clearSecrets() {
    setWords(Array(24).fill(""))
    setPassphrase("")
  }

  function updateWord(index: number, value: string) {
    setError(null)
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 1) {
      const next = [...words]
      parts.slice(0, 24 - index).forEach((part, offset) => {
        next[index + offset] = part
      })
      setWords(next)
      if (index + parts.length > 12) setWordCount(24)
      return
    }
    setWords(words.map((word, i) => (i === index ? value.trim() : word)))
  }

  function goTo(next: OnboardingStep) {
    clearSecrets()
    setError(null)
    setRevealed(false)
    setMasked(true)
    setPassMasked(true)
    setWordCount(12)
    setStep(next)
  }

  function finish() {
    setBusy(true)
    clearSecrets()
    timerRef.current = window.setTimeout(() => onComplete({ mode, lock: lockChoice }), 1200)
  }

  function submitVerify() {
    const wrong = VERIFY_POSITIONS.find((position) => picks[position] !== SAMPLE_PHRASE[position])
    if (wrong !== undefined) {
      setError(
        picks[wrong]
          ? `Word #${wrong + 1} doesn't match your backup. Check the order and try again.`
          : `Choose word #${wrong + 1}.`,
      )
      return
    }
    setError(null)
    setPicks({})
    setStep("lock")
  }

  function submitImport() {
    if (busy) return
    const missing = words.slice(0, wordCount).filter((word) => !word).length
    if (missing > 0) {
      setError(`Enter all ${wordCount} words. ${missing} ${missing === 1 ? "word is" : "words are"} missing.`)
      return
    }
    setError(null)
    clearSecrets()
    setMode("imported")
    setStep("lock")
  }

  if (step === "welcome") {
    return (
      <main className="onboarding" aria-labelledby="onboarding-title">
        <div className="onboarding__body">
          <div className="onboarding__hero">
            <span className="onboarding__brand product-section">VaultMe</span>
            <h1 id="onboarding-title" className="product-title">
              Your wallet, clear at every step
            </h1>
            <p className="product-body muted">
              Check balances and review each transfer before you confirm it.
            </p>
          </div>

          <ul className="feature-list feature-list--plain">
            {WELCOME_POINTS.map(({ Icon, title, body }) => (
              <li key={title} className="feature-row">
                <span className="feature-icon" aria-hidden="true">
                  <Icon weight="regular" />
                </span>
                <span className="row-body">
                  <strong className="product-row">{title}</strong>
                  <span className="product-body muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="choice-list onboarding__choices" role="group" aria-label="Get started">
            {/* using <button>: the kit's Button is a compact action; C06/C07 row-style choices are not shipped as components */}
            <button className="choice-card" type="button" onClick={() => goTo("create")}>
              <span className="choice-card__icon" aria-hidden="true">
                <Plus weight="regular" />
              </span>
              <span className="row-body">
                <strong className="product-label">Create a new wallet</strong>
                <span className="product-body muted">Start fresh and back up a recovery phrase.</span>
              </span>
              <CaretRight className="icon-inline" weight="regular" aria-hidden="true" />
            </button>
            {/* using <button>: same row-style choice as above */}
            <button className="choice-card" type="button" onClick={() => goTo("import")}>
              <span className="choice-card__icon" aria-hidden="true">
                <DownloadSimple weight="regular" />
              </span>
              <span className="row-body">
                <strong className="product-label">Import an existing wallet</strong>
                <span className="product-body muted">Use your 12 or 24 word phrase.</span>
              </span>
              <CaretRight className="icon-inline" weight="regular" aria-hidden="true" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (step === "verify" || step === "lock") {
    const isVerify = step === "verify"
    return (
      <main className="onboarding" aria-labelledby="onboarding-step-title">
        <div className="onboarding__body">
          <button
            className="icon-button onboarding__back"
            type="button"
            onClick={() => (isVerify ? goTo("create") : goTo(mode === "created" ? "create" : "import"))}
            disabled={busy}
            aria-label={isVerify ? "Back to recovery phrase" : "Back"}
          >
            <ArrowLeft weight="regular" aria-hidden="true" />
          </button>
          <div className="onboarding__hero">
            <h1 id="onboarding-step-title" className="product-title">
              {isVerify ? "Confirm your backup" : "Protect access to VaultMe"}
            </h1>
            <p className="product-body muted">
              {isVerify
                ? "Pick the right word for each position to show your sample phrase is written down in order."
                : "Choose whether the app asks for device authentication when it opens. You can change this in Settings."}
            </p>
          </div>

          {isVerify ? (
            <div className="import-fields">
              {VERIFY_POSITIONS.map((position) => (
                <div key={position} className="field">
                  <p id={`verify-${position}`} className="product-label">
                    Word #{position + 1}
                  </p>
                  <div
                    className="word-choices"
                    role="radiogroup"
                    aria-labelledby={`verify-${position}`}
                    aria-describedby={error ? "verify-error" : undefined}
                  >
                    {verifyOptions(position).map((word) => (
                      <button
                        key={word}
                        className="segmented__item word-choice product-body"
                        type="button"
                        role="radio"
                        aria-checked={picks[position] === word}
                        onClick={() => {
                          setError(null)
                          setPicks((current) => ({ ...current, [position]: word }))
                        }}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {error && (
                <p id="verify-error" className="field__error product-meta" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="segmented segmented--stack" role="radiogroup" aria-label="App lock">
              {[
                { value: true, title: "Use device lock (simulated)", body: "Face, fingerprint or device passcode. Simulated in this prototype." },
                { value: false, title: "Not now", body: "Anyone with your unlocked device can open the app." },
              ].map((option) => (
                <button
                  key={option.title}
                  className="segmented__item lock-choice"
                  type="button"
                  role="radio"
                  aria-checked={lockChoice === option.value}
                  onClick={() => setLockChoice(option.value)}
                >
                  <span className="row-body">
                    <strong className="product-label">{option.title}</strong>
                    <span className="product-body muted">{option.body}</span>
                  </span>
                  <span className="option__check" aria-hidden="true">
                    {lockChoice === option.value && <Check weight="regular" />}
                  </span>
                </button>
              ))}
            </div>
          )}

          <aside className="backup-notice" aria-labelledby="onboarding-notice">
            <ShieldWarning className="icon-feature" weight="regular" aria-hidden="true" />
            <div className="backup-notice__body">
              <h2 id="onboarding-notice" className="product-label">
                Prototype only
              </h2>
              <p className="product-body">
                Never enter a real recovery phrase here. Don't screenshot, copy or share a recovery phrase.
              </p>
            </div>
          </aside>
        </div>
        <footer className="onboarding__footer">
          <Button size="lg" block busy={busy} onClick={isVerify ? submitVerify : finish}>
            {busy ? <Clock weight="regular" aria-hidden="true" /> : <Check weight="regular" aria-hidden="true" />}
            {busy ? "Opening…" : isVerify ? "Confirm words" : "Continue to wallet"}
          </Button>
        </footer>
      </main>
    )
  }

  const isCreate = step === "create"

  return (
    <main className="onboarding" aria-labelledby="onboarding-step-title">
      <div className="onboarding__body">
        <button
          className="icon-button onboarding__back"
          type="button"
          onClick={() => goTo("welcome")}
          disabled={busy}
          aria-label="Back to welcome"
        >
          <ArrowLeft weight="regular" aria-hidden="true" />
        </button>
        <div className="onboarding__hero">
          <h1 id="onboarding-step-title" className="product-title">
            {isCreate ? "Back up your recovery phrase" : "Import an existing wallet"}
          </h1>
          <p className="product-body muted">
            {isCreate
              ? "These 12 words are a sample for this prototype. Reveal them to continue."
              : "Enter your 12 or 24 word recovery phrase and, if you set one, your passphrase."}
          </p>
        </div>

        {isCreate ? (
          <section className="phrase-card" aria-labelledby="phrase-title">
            <div className="phrase-card__head">
              <h2 id="phrase-title" className="product-label">
                Sample phrase (not a real key)
              </h2>
              <button
                className="text-button product-label"
                type="button"
                onClick={() => setRevealed((value) => !value)}
                aria-pressed={revealed}
              >
                {revealed ? (
                  <EyeSlash weight="regular" aria-hidden="true" />
                ) : (
                  <Eye weight="regular" aria-hidden="true" />
                )}
                {revealed ? "Hide" : "Show"}
              </button>
            </div>
            <ol className="phrase-grid" aria-label="Sample recovery phrase">
              {SAMPLE_PHRASE.map((word, index) => (
                <li key={word} className="phrase-word product-body">
                  <span className="muted tabular">{index + 1}</span>
                  <span>{revealed ? word : "••••••"}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <div className="import-fields">
            <div className="field">
              <div className="phrase-card__head">
                <h2 id="words-title" className="product-label">
                  Recovery phrase
                </h2>
                <button
                  className="text-button product-label"
                  type="button"
                  onClick={() => setMasked((value) => !value)}
                  aria-pressed={!masked}
                >
                  {masked ? (
                    <Eye weight="regular" aria-hidden="true" />
                  ) : (
                    <EyeSlash weight="regular" aria-hidden="true" />
                  )}
                  {masked ? "Show" : "Hide"}
                </button>
              </div>
              <div className="segmented" role="group" aria-label="Number of words">
                {([12, 24] as const).map((count) => (
                  <button
                    key={count}
                    className="segmented__item product-label"
                    type="button"
                    aria-pressed={wordCount === count}
                    onClick={() => {
                      setWordCount(count)
                      setError(null)
                    }}
                  >
                    {count} words
                  </button>
                ))}
              </div>
              <div className="word-grid" role="group" aria-labelledby="words-title" aria-describedby="words-help">
                {words.slice(0, wordCount).map((word, index) => (
                  <label key={index} className="word-field product-body">
                    <span className="word-field__index muted tabular">{index + 1}</span>
                    {/* using <input>: the kit ships no Input component; C03 defines the field contract */}
                    <input
                      className="field__input word-field__input product-body"
                      type={masked ? "password" : "text"}
                      value={word}
                      onChange={(event) => updateWord(index, event.target.value)}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={busy}
                      aria-label={`Word ${index + 1} of ${wordCount}`}
                      data-invalid={error && !word ? "true" : undefined}
                      aria-invalid={error && !word ? true : undefined}
                      aria-describedby={error ? "words-error" : undefined}
                    />
                  </label>
                ))}
              </div>
              <p id="words-help" className="product-meta muted">
                Enter one word per field, in order. You can paste the whole phrase into the first field.
              </p>
              {error && (
                <p id="words-error" className="field__error product-meta">
                  {error}
                </p>
              )}
            </div>

            <div className="field">
              <div className="phrase-card__head">
                <label htmlFor="passphrase-input" className="product-label">
                  Passphrase (optional)
                </label>
                <button
                  className="text-button product-label"
                  type="button"
                  onClick={() => setPassMasked((value) => !value)}
                  aria-pressed={!passMasked}
                >
                  {passMasked ? (
                    <Eye weight="regular" aria-hidden="true" />
                  ) : (
                    <EyeSlash weight="regular" aria-hidden="true" />
                  )}
                  {passMasked ? "Show" : "Hide"}
                </button>
              </div>
              {/* using <input>: the kit ships no Input component; C03 defines the field contract */}
              <input
                id="passphrase-input"
                className="field__input product-body"
                type={passMasked ? "password" : "text"}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                aria-describedby="passphrase-help"
              />
              <p id="passphrase-help" className="product-meta muted">
                Separate from the recovery phrase and case-sensitive. A different passphrase opens a
                different wallet. Leave empty if you never set one.
              </p>
            </div>
          </div>
        )}

        <aside className="backup-notice" aria-labelledby="onboarding-notice">
          <ShieldWarning className="icon-feature" weight="regular" aria-hidden="true" />
          <div className="backup-notice__body">
            <h2 id="onboarding-notice" className="product-label">
              Prototype only
            </h2>
            <p className="product-body">
              Never enter a real recovery phrase here. Import always opens the same sample vault. Don't screenshot, copy or share a recovery phrase.
            </p>
          </div>
        </aside>
      </div>
      <footer className="onboarding__footer">
        <Button
          size="lg"
          block
          busy={busy}
          disabled={isCreate && !revealed}
          onClick={isCreate ? () => { setMode("created"); goTo("verify") } : submitImport}
        >
          {busy ? (
            <Clock weight="regular" aria-hidden="true" />
          ) : isCreate ? (
            <Check weight="regular" aria-hidden="true" />
          ) : (
            <DownloadSimple weight="regular" aria-hidden="true" />
          )}
          {busy ? "Opening…" : isCreate ? "I've saved my phrase" : "Import wallet"}
        </Button>
      </footer>
    </main>
  )
}


const TAB_SCREENS: Screen[] = ["home", "activity", "settings"]

const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  asset: "Asset",
  receive: "Receive",
  send: "Send",
  review: "Review send",
  swap: "Swap",
  "swap-review": "Review swap",
  tx: "Transaction",
}

function AppBar({
  screen,
  scrolled,
  menuOpen,
  onBack,
  onReceive,
  onMenu,
}: {
  screen: Screen
  scrolled: boolean
  menuOpen: boolean
  onBack: () => void
  onReceive: () => void
  onMenu: () => void
}) {
  const title = SCREEN_TITLES[screen]
  if (title) {
    return (
      <header className="app-bar" data-scrolled={scrolled}>
        <div className="app-bar__inner app-bar__inner--review">
          <button className="icon-button" type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft weight="regular" aria-hidden="true" />
          </button>
          <h1 className="product-section app-bar__title">{title}</h1>
          <span className="icon-spacer" aria-hidden="true" />
        </div>
      </header>
    )
  }

  return (
    <header className="app-bar app-bar--compact" data-scrolled={scrolled}>
      <div className="app-bar__inner">
        <button
          className="icon-button"
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="app-drawer"
        >
          <List weight="regular" aria-hidden="true" />
        </button>
        <span className="product-section app-bar__title app-bar__title--start">
          {screen === "activity" ? "Activity" : screen === "settings" ? "Settings" : "VaultMe"}
        </span>
        <button className="icon-button" type="button" onClick={onReceive} aria-label="Receive: show my address by network">
          <QrCode weight="regular" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

function Drawer({
  open,
  screen,
  onClose,
  onGo,
}: {
  open: boolean
  screen: Screen
  onClose: () => void
  onGo: (screen: Screen) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>("button")?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab" || !panelRef.current) return
      const items = panelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      opener?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const links = [
    { id: "receive" as const, label: "Receive", Icon: QrCode },
    { id: "activity" as const, label: "Activity", Icon: ClockCounterClockwise },
    { id: "settings" as const, label: "Settings", Icon: GearSix },
  ]

  return (
    <div className="drawer-layer">
      {/* Backdrop is pointer-only; keyboard users close with Escape or the Close button */}
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="app-drawer"
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer__head">
          <h2 id="drawer-title" className="product-section">
            VaultMe
          </h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close menu">
            <X weight="regular" aria-hidden="true" />
          </button>
        </div>

        <section className="drawer__account" aria-label="Current account">
          <span className="account-avatar product-label" aria-hidden="true">
            EV
          </span>
          <span className="row-body">
            <strong className="product-row">{ACCOUNT_NAME}</strong>
            <span className="network-chip product-meta">
              <span className="network-dot" aria-hidden="true" />
              All networks · 5 supported
            </span>
          </span>
        </section>
        <p className="product-meta muted">
          Only one synthetic account is available. Addresses differ by network—open Receive to copy one.
        </p>

        <nav className="drawer__nav" aria-label="Menu">
          {links.map(({ id, label, Icon }) => (
            <button
              key={id}
              className="nav-item drawer__item product-label"
              type="button"
              aria-current={screen === id ? "page" : undefined}
              onClick={() => onGo(id)}
            >
              <Icon weight="regular" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Navigation({
  screen,
  onNavigate,
}: {
  screen: Screen
  onNavigate: (screen: Screen) => void
}) {
  const items = [
    { id: "home" as const, label: "Home", Icon: House, match: ["home", "asset", "receive"] },
    { id: "send" as const, label: "Send", Icon: PaperPlaneTilt, match: ["send", "review"] },
    { id: "swap" as const, label: "Swap", Icon: ArrowsLeftRight, match: ["swap", "swap-review"] },
    { id: "activity" as const, label: "Activity", Icon: ClockCounterClockwise, match: ["activity", "tx"] },
  ]

  return (
    <nav className="tab-bar" aria-label="Primary navigation">
      <span className="rail-brand product-section">VaultMe</span>
      {items.map(({ id, label, Icon, match }) => (
        <button
          key={id}
          className="nav-item product-meta"
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={match.includes(screen) ? "page" : undefined}
        >
          <Icon weight="regular" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  )
}

type BalanceState = "ok" | "error" | "loading"

function AssetRow({
  asset,
  balanceState,
  disabled,
  onOpen,
}: {
  asset: Asset
  balanceState: BalanceState
  disabled: boolean
  onOpen: () => void
}) {
  const chain = chainOf(asset.chain)
  return (
    // using <button>: C09 asset row has no shipped component; a row-level button opens detail
    <button className="asset-row row-button" type="button" onClick={onOpen}>
      <AssetIcon symbol={asset.symbol} name={asset.name} />
      <span className="row-body">
        <strong className="product-row">{asset.name}</strong>
        <span className="product-body muted">
          {chain.name} · {asset.standard === "Native" ? "Native" : asset.standard}
          {disabled && " · Paused"}
        </span>
      </span>
      <span className="row-value">
        {balanceState === "ok" ? (
          <>
            <strong className="product-row">{formatQty(asset.balanceRaw, asset.symbol)}</strong>
            <span className="product-body muted">≈ {formatUsd(asset.balanceRaw * asset.price)}</span>
          </>
        ) : (
          <>
            <strong className="product-row">{formatQty(asset.balanceRaw, asset.symbol)}</strong>
            <span className="row-status row-status--warning product-body">
              <Warning className="icon-inline" weight="regular" aria-hidden="true" />
              {balanceState === "loading" ? "Refreshing…" : "Not updated"}
            </span>
          </>
        )}
      </span>
    </button>
  )
}

const TX_STATUS_COPY: Record<TxStatus, { label: string; Icon: typeof Clock }> = {
  pending: { label: "Pending", Icon: Clock },
  processing: { label: "Processing", Icon: Clock },
  confirmed: { label: "Confirmed", Icon: CheckCircle },
  failed: { label: "Failed", Icon: XCircle },
  unknown: { label: "Not final yet", Icon: Question },
}

function txTitle(tx: Tx) {
  const asset = assetOf(tx.assetId)
  if (tx.type === "swap") return `Swapped ${asset.symbol} → ${assetOf(tx.toAssetId ?? "").symbol}`
  return `${tx.type === "send" ? "Sent" : "Received"} ${asset.symbol}`
}

function txAmount(tx: Tx) {
  const asset = assetOf(tx.assetId)
  if (tx.type === "swap") {
    return `+${formatQty(tx.toAmount ?? 0, assetOf(tx.toAssetId ?? "").symbol)}`
  }
  return `${tx.type === "send" ? "−" : "+"}${formatQty(tx.amount, asset.symbol)}`
}

function ActivityRow({ tx, onOpen }: { tx: Tx; onOpen: () => void }) {
  const Icon = tx.type === "send" ? ArrowUpRight : tx.type === "swap" ? ArrowsLeftRight : ArrowDown
  const { label, Icon: StatusIcon } = TX_STATUS_COPY[tx.status]
  const chain = chainOf(assetOf(tx.assetId).chain)

  return (
    // using <button>: C10 activity row has no shipped component; a row-level button opens detail
    <button className="activity-row row-button" type="button" onClick={onOpen}>
      <span
        className={`activity-icon ${tx.status !== "confirmed" ? "activity-icon--pending" : ""}`}
        aria-hidden="true"
      >
        <Icon weight="regular" />
      </span>
      <span className="row-body">
        <strong className="product-row">{txTitle(tx)}</strong>
        <span className="product-body muted">
          {tx.type === "swap"
            ? chain.name
            : `${tx.type === "send" ? "To" : "From"} ${shortAddress(tx.counterparty)} · ${chain.name}`}
        </span>
      </span>
      <span className="row-value">
        <strong className="product-row">{txAmount(tx)}</strong>
        <span className={`row-status row-status--${tx.status} product-body`}>
          <StatusIcon className="icon-inline" weight="regular" aria-hidden="true" />
          {label}
        </span>
      </span>
    </button>
  )
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function dayLabel(ms: number) {
  const days = Math.floor((new Date().setHours(24, 0, 0, 0) - ms) / 86_400_000)
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function groupByDay(txs: Tx[]) {
  const groups: { label: string; items: Tx[] }[] = []
  txs.forEach((tx) => {
    const label = dayLabel(tx.requestedAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(tx)
    else groups.push({ label, items: [tx] })
  })
  return groups
}

function Home({
  balances,
  tronState,
  tronUpdated,
  enabled,
  txs,
  backup,
  rooted,
  onRetryTron,
  onOpenAsset,
  onOpenTx,
  onNavigate,
}: {
  balances: Asset[]
  tronState: BalanceState
  tronUpdated: number
  enabled: Record<ChainId, boolean>
  txs: Tx[]
  backup: "created" | "imported"
  rooted: boolean
  onRetryTron: () => void
  onOpenAsset: (id: string) => void
  onOpenTx: (id: string) => void
  onNavigate: (screen: Screen) => void
}) {
  const [query, setQuery] = useState("")
  const total = balances
    .filter((asset) => asset.chain !== "tron" || tronState === "ok")
    .reduce((sum, asset) => sum + asset.balanceRaw * asset.price, 0)
  const partial = tronState !== "ok"
  const q = query.trim().toLowerCase()
  const visible = balances.filter((asset) =>
    [asset.name, asset.symbol, chainOf(asset.chain).name, asset.standard].some((value) =>
      value.toLowerCase().includes(q),
    ),
  )
  const chains = new Set(balances.map((asset) => asset.chain)).size

  return (
    <main className="home">
      {rooted && (
        <Notice tone="danger" title="Device risk detected (simulated)">
          This device looks rooted or jailbroken. Sending and swapping are limited until the check passes.
        </Notice>
      )}

      <section className="portfolio" aria-labelledby="portfolio-title">
        <h1 id="portfolio-title" className="product-label portfolio__note">
          Portfolio balance
        </h1>
        <p className="product-balance tabular portfolio__value">{formatUsd(total)}</p>
        <p className="product-body portfolio__note">
          {partial ? "Partial estimate · Tron not included" : "Complete estimate"} · {balances.length} assets on{" "}
          {chains} networks
        </p>
        <div className="quick-actions quick-actions--three">
          <Button onClick={() => onNavigate("send")} disabled={rooted}>
            <PaperPlaneTilt weight="regular" aria-hidden="true" />
            Send
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("receive")}>
            <QrCode weight="regular" aria-hidden="true" />
            Receive
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("swap")} disabled={rooted}>
            <ArrowsLeftRight weight="regular" aria-hidden="true" />
            Swap
          </Button>
        </div>
      </section>

      <div className="home-grid">
        <section className="section" aria-labelledby="assets-title">
          <div className="section-heading">
            <h2 id="assets-title" className="product-section">
              Assets
            </h2>
            <span className="product-meta muted">Estimated values</span>
          </div>
          <label className="search-field">
            <MagnifyingGlass className="icon-inline" weight="regular" aria-hidden="true" />
            <span className="sr-only">Search assets</span>
            {/* using <input>: the kit ships no Input component; C03 defines the field contract */}
            <input
              className="search-field__input product-body"
              type="search"
              placeholder="Search BTC, ETH, XRP, SOL…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {partial && (
            <Notice tone="warning" title="Tron balances not updated">
              <p>
                Last updated {formatTime(tronUpdated)}. The balance provider didn't respond; values shown may be out of
                date.
              </p>
              <button className="text-button product-label inline-action" type="button" onClick={onRetryTron} disabled={tronState === "loading"}>
                <ArrowClockwise weight="regular" aria-hidden="true" />
                {tronState === "loading" ? "Retrying…" : "Retry"}
              </button>
            </Notice>
          )}
          <div className="reading-container">
            {visible.length === 0 ? (
              <p className="empty-row product-body muted" role="status">
                No supported asset matches “{query}”.
              </p>
            ) : (
              visible.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  balanceState={asset.chain === "tron" ? tronState : "ok"}
                  disabled={!enabled[asset.chain]}
                  onOpen={() => onOpenAsset(asset.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="section" aria-labelledby="activity-title">
          <div className="section-heading">
            <h2 id="activity-title" className="product-section">
              Activity
            </h2>
            <button className="text-button product-label" type="button" onClick={() => onNavigate("activity")}>
              See all
              <CaretRight weight="regular" aria-hidden="true" />
            </button>
          </div>
          <div className="reading-container">
            {groupByDay(txs.slice(0, 4)).map((group) => (
              <div key={group.label}>
                <p className="list-group-label product-meta">{group.label}</p>
                {group.items.map((tx) => (
                  <ActivityRow key={tx.id} tx={tx} onOpen={() => onOpenTx(tx.id)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="backup-notice" aria-labelledby="backup-title">
        <ShieldWarning className="icon-feature" weight="regular" aria-hidden="true" />
        <div className="backup-notice__body">
          <h2 id="backup-title" className="product-label">
            {backup === "created" ? "Sample phrase backed up (test)" : "Imported sample vault (test)"}
          </h2>
          <p className="product-body">
            This synthetic vault has no real recovery phrase or private key. Never enter wallet credentials in this
            prototype.
          </p>
        </div>
      </aside>
    </main>
  )
}

function ReviewRow({
  label,
  children,
  inline = false,
}: {
  label: string
  children: React.ReactNode
  inline?: boolean
}) {
  return (
    <div className={`review-row ${inline ? "review-row--inline" : ""}`}>
      <dt className="product-label">{label}</dt>
      <dd className="product-body">{children}</dd>
    </div>
  )
}

function AssetDetail({
  asset,
  balanceState,
  tronUpdated,
  enabled,
  rooted,
  txs,
  onSend,
  onReceive,
  onSwap,
  onOpenTx,
  onCopy,
}: {
  asset: Asset
  balanceState: BalanceState
  tronUpdated: number
  enabled: boolean
  rooted: boolean
  txs: Tx[]
  onSend: () => void
  onReceive: () => void
  onSwap: () => void
  onOpenTx: (id: string) => void
  onCopy: (text: string, label?: string) => void
}) {
  const chain = chainOf(asset.chain)
  const related = txs.filter((tx) => tx.assetId === asset.id || tx.toAssetId === asset.id)
  const swapSupported = !SWAP_UNSUPPORTED.includes(asset.chain)

  return (
    <main className="review" aria-labelledby="asset-balance">
      <div className="review__body">
        <header className="review-hero">
          <AssetIcon symbol={asset.symbol} name={asset.name} size="lg" />
          <span className="product-body muted">
            {asset.name} on {chain.name}
          </span>
          <p id="asset-balance" className="product-amount">
            {formatQty(asset.balanceRaw, asset.symbol)}
          </p>
          <p className="product-body muted">≈ {formatUsd(asset.balanceRaw * asset.price)} estimate</p>
        </header>

        <div className="quick-actions quick-actions--three">
          <Button onClick={onSend} disabled={!enabled || rooted}>
            <PaperPlaneTilt weight="regular" aria-hidden="true" />
            Send
          </Button>
          <Button variant="secondary" onClick={onReceive} disabled={!enabled}>
            <QrCode weight="regular" aria-hidden="true" />
            Receive
          </Button>
          <Button variant="secondary" onClick={onSwap} disabled={!enabled || rooted || !swapSupported}>
            <ArrowsLeftRight weight="regular" aria-hidden="true" />
            Swap
          </Button>
        </div>

        {!enabled && (
          <Notice tone="warning" title={`${chain.name} is paused`}>
            Sending and receiving on {chain.name} are turned off in network management. Balances stay visible.
          </Notice>
        )}
        {enabled && !swapSupported && (
          <Notice tone="info" title="Swap not supported">
            There is no supported swap route for {chain.name} assets in this prototype.
          </Notice>
        )}
        {balanceState !== "ok" && (
          <Notice tone="warning" title="Balance not updated">
            Last updated {formatTime(tronUpdated)}. Retry from Home.
          </Notice>
        )}

        <dl className="review-card">
          <ReviewRow label="Network" inline>
            {chain.name} ({chain.family})
          </ReviewRow>
          <ReviewRow label="Token standard" inline>
            {asset.standard}
          </ReviewRow>
          <ReviewRow label="Unit price" inline>
            {formatUsd(asset.price)}
            <span className="review-row__sub">Estimate · synthetic quote</span>
          </ReviewRow>
          <ReviewRow label="Last updated" inline>
            {balanceState === "ok" ? "Just now" : formatTime(tronUpdated)}
          </ReviewRow>
          {asset.contract && (
            <ReviewRow label="Token contract">
              <span className="product-address review-address">{asset.contract}</span>
              <button
                className="text-button product-label inline-action"
                type="button"
                onClick={() => onCopy(asset.contract ?? "", "Contract copied")}
              >
                <Copy weight="regular" aria-hidden="true" />
                Copy contract
              </button>
            </ReviewRow>
          )}
        </dl>

        <section className="section" aria-labelledby="asset-activity-title">
          <h2 id="asset-activity-title" className="product-section">
            Activity
          </h2>
          <div className="reading-container">
            {related.length === 0 ? (
              <p className="empty-row product-body muted">No activity for this asset yet.</p>
            ) : (
              related.map((tx) => <ActivityRow key={tx.id} tx={tx} onOpen={() => onOpenTx(tx.id)} />)
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Receive({
  chainId,
  enabled,
  onChain,
  onCopy,
  onToast,
}: {
  chainId: ChainId
  enabled: Record<ChainId, boolean>
  onChain: (id: ChainId) => void
  onCopy: (text: string, label?: string) => void
  onToast: (message: string) => void
}) {
  const chain = chainOf(chainId)
  const available = CHAINS.filter((item) => enabled[item.id])
  const assets = ASSETS.filter((asset) => asset.chain === chainId)

  async function share() {
    const text = `${chain.name} address (VaultMe prototype): ${chain.address}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "My address", text })
        onToast("Share sheet opened")
      } catch {
        onToast("Share cancelled")
      }
    } else {
      onCopy(chain.address, "Share unavailable · address copied instead")
    }
  }

  return (
    <main className="review" aria-labelledby="receive-title">
      <div className="review__body">
        <header className="send-intro">
          <h2 id="receive-title" className="product-title">
            Receive on {chain.name}
          </h2>
          <p className="product-body muted">
            Only send {chain.name} network assets to this address. Assets from another network may be lost.
          </p>
        </header>

        <OptionList
          name="receive-network"
          legend="Network"
          options={available}
          value={chainId}
          onChange={(id) => onChain(id as ChainId)}
          render={(item) => (
            <>
              <AssetIcon symbol={item.feeSymbol} name={item.name} decorative />
              <span className="row-body">
                <strong className="product-row">{item.name}</strong>
                <span className="product-body muted">{shortAddress(item.address)}</span>
              </span>
            </>
          )}
        />

        <section className="receive-card" aria-labelledby="receive-address-label">
          <div className="qr-placeholder" role="img" aria-label="QR code is not generated in this prototype">
            <QrCode weight="regular" aria-hidden="true" />
            <span className="product-meta muted">QR not generated in this prototype</span>
          </div>
          <div className="field">
            <p id="receive-address-label" className="product-label">
              {ACCOUNT_NAME} · {chain.name}
            </p>
            <p className="product-address review-address">{chain.address}</p>
            <p className="product-meta muted">Supports {assets.map((asset) => `${asset.symbol} (${asset.standard})`).join(", ")}</p>
          </div>
          <div className="quick-actions">
            <Button onClick={() => onCopy(chain.address)}>
              <Copy weight="regular" aria-hidden="true" />
              Copy address
            </Button>
            <Button variant="secondary" onClick={share}>
              <ShareNetwork weight="regular" aria-hidden="true" />
              Share
            </Button>
          </div>
        </section>

        <Notice tone="info" title="Incoming transfers">
          Received assets appear in Activity as Pending, then Confirmed. This prototype does not watch a real network.
        </Notice>
      </div>
    </main>
  )
}

const STATUS_COPY = {
  ready: {
    title: "Ready to simulate",
    body: "Nothing has been submitted. The simulation runs locally in this prototype.",
    Icon: Info,
  },
  pending: {
    title: "Pending",
    body: "Local simulation is processing. No RPC or wallet is connected.",
    Icon: Clock,
  },
  confirmed: {
    title: "Confirmed (simulated)",
    body: "The local simulation completed. No on-chain transfer happened.",
    Icon: CheckCircle,
  },
}

function StatusNotice({ status, txId }: { status: SimulationStatus; txId?: string }) {
  const { title, body, Icon } = STATUS_COPY[status]
  const order: SimulationStatus[] = ["ready", "pending", "confirmed"]
  const current = order.indexOf(status)

  return (
    <div className={`status-notice status-notice--${status}`} role="status" aria-live="polite">
      <Icon className="icon-feature" weight="regular" aria-hidden="true" />
      <div className="status-notice__body">
        <p className="product-label">{title}</p>
        <p className="product-body">{body}</p>
        <ol className="steps" aria-label="Simulation progress">
          {["Ready", "Pending", "Confirmed"].map((label, index) => (
            <li
              key={label}
              className={`step product-meta ${
                index < current ? "step--done" : index === current ? "step--current" : ""
              }`}
              aria-current={index === current ? "step" : undefined}
            >
              <span className="step__track" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ol>
        {txId && status !== "ready" && (
          <p className="product-meta">
            Synthetic transaction ID <span className="product-address review-address">{txId}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function Acknowledge({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className="ack-row product-body">
      {/* using <input type="checkbox">: the kit ships no Checkbox component */}
      <input
        className="ack-row__input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}

function SendReview({
  asset,
  amount,
  recipient,
  status,
  txId,
  onSimulate,
  onCancel,
  onDone,
  onViewTx,
}: {
  asset: Asset
  amount: number
  recipient: string
  status: SimulationStatus
  txId?: string
  onSimulate: () => void
  onCancel: () => void
  onDone: () => void
  onViewTx: () => void
}) {
  const chain = chainOf(asset.chain)
  const fee = feeFor(asset)
  const usd = amount * asset.price
  const large = usd >= LARGE_AMOUNT_USD
  const [ack, setAck] = useState(false)
  const amountText = formatQty(amount, asset.symbol)

  return (
    <main className="review" aria-labelledby="review-amount">
      <div className="review__body">
        <header className="review-hero">
          <AssetIcon symbol={asset.symbol} name={asset.name} size="lg" />
          <span className="product-body muted">You're sending</span>
          <p id="review-amount" className="product-amount">
            {amountText}
          </p>
          <p className="product-body muted">Estimated value {formatUsd(usd)}</p>
        </header>

        <dl className="review-card">
          <ReviewRow label="From">
            <span className="product-row">{ACCOUNT_NAME}</span>
            <span className="product-address review-address">{chain.address}</span>
          </ReviewRow>
          <ReviewRow label="To">
            <span className="product-address review-address">{recipient}</span>
            <span className="review-row__sub product-meta">
              Check the first and last characters: {recipient.slice(0, 6)} … {recipient.slice(-6)}
            </span>
          </ReviewRow>
        </dl>

        <dl className="review-card">
          <ReviewRow label="Network" inline>
            {chain.name}
          </ReviewRow>
          <ReviewRow label="Asset" inline>
            {asset.name} ({asset.symbol} · {asset.standard})
          </ReviewRow>
          <ReviewRow label="Amount" inline>
            {amountText}
            <span className="review-row__sub">≈ {formatUsd(usd)} estimate</span>
          </ReviewRow>
          <ReviewRow label="Estimated network fee" inline>
            {formatQty(fee.amount, fee.symbol)}
            <span className="review-row__sub">≈ {formatUsd(fee.usd)} estimate</span>
          </ReviewRow>
          <ReviewRow label="Recipient gets (estimate)" inline>
            {amountText}
          </ReviewRow>
          <ReviewRow label="Status" inline>
            {STATUS_COPY[status].title}
          </ReviewRow>
        </dl>

        {large && status === "ready" && (
          <div className="field">
            <Notice tone="warning" title="Large transfer">
              This send is worth about {formatUsd(usd)}. Transfers can't be reversed once confirmed.
            </Notice>
            <Acknowledge checked={ack} onChange={setAck}>
              I checked the full recipient address and network.
            </Acknowledge>
          </div>
        )}

        <StatusNotice status={status} txId={txId} />
      </div>

      {status === "confirmed" ? (
        <footer className="review-footer">
          <Button variant="secondary" size="lg" onClick={onViewTx}>
            View details
          </Button>
          <Button size="lg" onClick={onDone}>
            <Check weight="regular" aria-hidden="true" />
            Done
          </Button>
        </footer>
      ) : (
        <footer className="review-footer">
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={status === "pending"}>
            Cancel
          </Button>
          <Button size="lg" onClick={onSimulate} busy={status === "pending"} disabled={large && !ack}>
            {status === "pending" ? (
              <Clock weight="regular" aria-hidden="true" />
            ) : (
              <PaperPlaneTilt weight="regular" aria-hidden="true" />
            )}
            {status === "pending" ? "Simulating…" : "Simulate send"}
          </Button>
        </footer>
      )}
    </main>
  )
}

function OptionList<T extends { id: string }>({
  name,
  legend,
  options,
  value,
  onChange,
  render,
}: {
  name: string
  legend: string
  options: T[]
  value: string
  onChange: (id: string) => void
  render: (option: T) => React.ReactNode
}) {
  return (
    <fieldset className="option-group">
      <legend className="product-section option-group__legend">{legend}</legend>
      <div className="option-list">
        {options.map((option) => (
          <label key={option.id} className="option">
            <input
              className="option__input"
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            {render(option)}
            <span className="option__check" aria-hidden="true">
              {value === option.id && <Check weight="regular" />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function RecipientField({
  value,
  chainId,
  error,
  warning,
  pasted,
  onChange,
  onBlur,
  onPaste,
  onScan,
}: {
  value: string
  chainId: ChainId
  error: string | null
  warning?: string
  pasted: boolean
  onChange: (value: string) => void
  onBlur: () => void
  onPaste: () => void
  onScan: () => void
}) {
  const chain = chainOf(chainId)
  const describedBy = ["recipient-help", pasted ? "recipient-paste" : "", warning ? "recipient-warning" : "", error ? "recipient-error" : ""]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="field">
      <label htmlFor="recipient-input" className="product-section option-group__legend">
        Recipient
      </label>
      <div className="amount-field amount-field--address" data-invalid={error ? "true" : undefined}>
        {/* using <textarea>: the kit ships no Input component; C12 requires the full address to wrap */}
        <textarea
          id="recipient-input"
          className="amount-field__input recipient-input product-address"
          rows={2}
          placeholder={`${chain.name} address`}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\s+/g, ""))}
          onBlur={onBlur}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button className="icon-button" type="button" onClick={onPaste} aria-label="Paste address from clipboard">
          <ClipboardText weight="regular" aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" onClick={onScan} aria-label="Scan QR code (simulated)">
          <QrCode weight="regular" aria-hidden="true" />
        </button>
      </div>
      <p id="recipient-help" className="amount-help product-meta muted">
        <span>{chain.addressHint}</span>
      </p>
      {pasted && !error && (
        <p id="recipient-paste" className="field__note product-meta">
          <Warning className="icon-inline" weight="regular" aria-hidden="true" />
          Pasted from clipboard. Clipboard content can be replaced by malware—compare the whole address.
        </p>
      )}
      {warning && !error && (
        <p id="recipient-warning" className="field__note product-meta">
          <Warning className="icon-inline" weight="regular" aria-hidden="true" />
          {warning}
        </p>
      )}
      {error && (
        <p id="recipient-error" className="field__error product-meta">
          {error}
        </p>
      )}
    </div>
  )
}

function SendSelect({
  networkId,
  assetId,
  amount,
  recipient,
  balances,
  enabled,
  rooted,
  onNetwork,
  onAsset,
  onAmount,
  onRecipient,
  onContinue,
  onToast,
}: {
  networkId: ChainId
  assetId: string
  amount: string
  recipient: string
  balances: Asset[]
  enabled: Record<ChainId, boolean>
  rooted: boolean
  onNetwork: (id: ChainId) => void
  onAsset: (id: string) => void
  onAmount: (value: string) => void
  onRecipient: (value: string) => void
  onContinue: () => void
  onToast: (message: string) => void
}) {
  const [touched, setTouched] = useState(false)
  const [recipientTouched, setRecipientTouched] = useState(false)
  const [pasted, setPasted] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)
  const scanRef = useRef<number | undefined>(undefined)
  const chain = chainOf(networkId)
  const networks = CHAINS.filter((item) => enabled[item.id])
  const chainAssets = balances.filter((item) => item.chain === networkId)
  const selected = chainAssets.find((item) => item.id === assetId) ?? chainAssets[0]
  const fee = feeFor(selected)
  const feeBalance = balances.find((item) => item.id === fee.feeAsset?.id)?.balanceRaw ?? 0
  const error = touched ? validateAmount(amount, selected) : null
  const recipientCheck = validateRecipient(recipient, chain)
  const recipientError = recipientTouched ? (recipientCheck.error ?? null) : null
  const estimate = formatUsd((Number(amount) || 0) * selected.price)

  useEffect(() => () => window.clearTimeout(scanRef.current), [])
  useEffect(() => setFeeError(null), [amount, assetId, networkId])

  function checkFee() {
    const value = Number(amount)
    const needed = selected.standard === "Native" ? value + fee.amount : fee.amount
    const have = selected.standard === "Native" ? selected.balanceRaw : feeBalance
    if (needed > have) {
      return selected.standard === "Native"
        ? `Not enough ${fee.symbol} for amount plus the estimated fee (${formatQty(fee.amount, fee.symbol)}). Lower the amount or use Max.`
        : `Not enough ${fee.symbol} to pay the estimated network fee of ${formatQty(fee.amount, fee.symbol)}. You have ${formatQty(have, fee.symbol)}.`
    }
    return null
  }

  function submit() {
    setTouched(true)
    setRecipientTouched(true)
    if (validateAmount(amount, selected) || recipientCheck.error) return
    const blocked = checkFee()
    setFeeError(blocked)
    if (!blocked) onContinue()
  }

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) {
        onToast("Clipboard is empty")
        return
      }
      onRecipient(text.replace(/\s+/g, ""))
      setPasted(true)
      setRecipientTouched(true)
    } catch {
      onToast("Clipboard access unavailable · type or paste the address")
    }
  }

  function scan() {
    setScanning(true)
    scanRef.current = window.setTimeout(() => {
      setScanning(false)
      setPasted(false)
      onRecipient(chain.sampleRecipient)
      setRecipientTouched(true)
      onToast("Simulated scan filled a sample address")
    }, 900)
  }

  if (rooted) {
    return (
      <main className="review">
        <div className="review__body">
          <Notice tone="danger" title="Sending is limited on this device (simulated)">
            A rooted or jailbroken device was detected. Turn off the simulation in Settings to continue.
          </Notice>
        </div>
      </main>
    )
  }

  return (
    <main className="review" aria-labelledby="send-title">
      <div className="review__body">
        <header className="send-intro">
          <h2 id="send-title" className="product-title">
            What do you want to send?
          </h2>
          <p className="product-body muted">
            Choose the network first, then the asset. Paused networks aren't listed.
          </p>
        </header>

        <OptionList
          name="network"
          legend="Network"
          options={networks}
          value={networkId}
          onChange={(id) => {
            onNetwork(id as ChainId)
            setRecipientTouched(false)
            setPasted(false)
          }}
          render={(network) => (
            <>
              <AssetIcon symbol={network.feeSymbol} name={network.name} decorative />
              <span className="row-body">
                <strong className="product-row">{network.name}</strong>
                <span className="product-body muted">Network fees are paid in {network.feeSymbol}</span>
              </span>
            </>
          )}
        />

        <OptionList
          name="asset"
          legend="Asset"
          options={chainAssets}
          value={selected.id}
          onChange={(id) => {
            onAsset(id)
            setTouched(false)
          }}
          render={(asset) => (
            <>
              <AssetIcon symbol={asset.symbol} name={asset.name} decorative />
              <span className="row-body">
                <strong className="product-row">
                  {asset.name} <span className="muted">· {asset.standard}</span>
                </strong>
                <span className="product-body muted">Available {formatQty(asset.balanceRaw, asset.symbol)}</span>
              </span>
            </>
          )}
        />

        <RecipientField
          value={recipient}
          chainId={networkId}
          error={recipientError}
          warning={recipientTouched ? recipientCheck.warning : undefined}
          pasted={pasted}
          onChange={(value) => {
            onRecipient(value)
            setPasted(false)
          }}
          onBlur={() => recipient && setRecipientTouched(true)}
          onPaste={paste}
          onScan={scan}
        />
        {scanning && (
          <Notice tone="info" title="Scanning (simulated)" live>
            No camera is used. A sample {chain.name} address will be filled in.
          </Notice>
        )}

        <div className="field">
          <label htmlFor="amount-input" className="product-section option-group__legend">
            Amount
          </label>
          <div className="amount-field" data-invalid={error ? "true" : undefined}>
            {/* using <input>: the kit ships no Input component; C13 defines the amount field contract */}
            <input
              id="amount-input"
              className="amount-field__input product-title tabular"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => onAmount(event.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
              onBlur={() => amount && setTouched(true)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "amount-help amount-error" : "amount-help"}
            />
            <span className="amount-field__unit product-label">{selected.symbol}</span>
            <button
              className="text-button product-label"
              type="button"
              onClick={() => {
                const max = selected.standard === "Native" ? Math.max(selected.balanceRaw - fee.amount, 0) : selected.balanceRaw
                onAmount(String(Number(max.toFixed(Math.min(selected.decimals, 8)))))
                setTouched(true)
              }}
            >
              Max
            </button>
          </div>
          <p id="amount-help" className="amount-help product-meta muted">
            <span>Available {formatQty(selected.balanceRaw, selected.symbol)}</span>
            <span className="tabular">≈ {estimate} estimate</span>
          </p>
          {error && (
            <p id="amount-error" className="field__error product-meta">
              {error}
            </p>
          )}
        </div>

        <dl className="review-card">
          <ReviewRow label="Estimated network fee" inline>
            {formatQty(fee.amount, fee.symbol)}
            <span className="review-row__sub">≈ {formatUsd(fee.usd)} estimate</span>
          </ReviewRow>
        </dl>

        {feeError && (
          <Notice tone="danger" title="Not enough balance" live>
            {feeError}
          </Notice>
        )}
      </div>

      <footer className="review-footer review-footer--single">
        <Button size="lg" block onClick={submit}>
          Continue
          <ArrowRight weight="regular" aria-hidden="true" />
        </Button>
      </footer>
    </main>
  )
}

const QUOTE_SECONDS = 30
const SLIPPAGE_OPTIONS = [0.5, 1, 2]
const SERVICE_FEE = 0.003
const LIQUIDITY_LIMIT_USD = 5000

type Quote = { rate: number; issuedAt: number }

function Swap({
  fromId,
  toId,
  amount,
  slippage,
  quote,
  balances,
  enabled,
  rooted,
  onFrom,
  onTo,
  onAmount,
  onSlippage,
  onQuote,
  onContinue,
}: {
  fromId: string
  toId: string
  amount: string
  slippage: number
  quote: Quote | null
  balances: Asset[]
  enabled: Record<ChainId, boolean>
  rooted: boolean
  onFrom: (id: string) => void
  onTo: (id: string) => void
  onAmount: (value: string) => void
  onSlippage: (value: number) => void
  onQuote: () => void
  onContinue: () => void
}) {
  const [touched, setTouched] = useState(false)
  const remaining = useCountdown(quote)
  const from = balances.find((item) => item.id === fromId) ?? balances[0]
  const to = assetOf(toId)
  const usable = balances.filter((item) => enabled[item.chain])
  const amountError = touched ? validateAmount(amount, from) : null
  const value = Number(amount) || 0
  const unsupported =
    from.id === to.id
      ? "Choose two different assets."
      : SWAP_UNSUPPORTED.includes(from.chain) || SWAP_UNSUPPORTED.includes(to.chain)
        ? `No supported route between ${from.symbol} on ${chainOf(from.chain).name} and ${to.symbol} on ${chainOf(to.chain).name}.`
        : null
  const noLiquidity = !unsupported && value * from.price > LIQUIDITY_LIMIT_USD
  const quoteReady = !unsupported && !noLiquidity && value > 0 && !validateAmount(amount, from)
  const breakdown = quote ? swapBreakdown(from, to, value, quote.rate, slippage) : null

  useEffect(() => {
    if (quoteReady) onQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId, amount, quoteReady])

  if (rooted) {
    return (
      <main className="review">
        <div className="review__body">
          <Notice tone="danger" title="Swapping is limited on this device (simulated)">
            A rooted or jailbroken device was detected. Turn off the simulation in Settings to continue.
          </Notice>
        </div>
      </main>
    )
  }

  return (
    <main className="review" aria-labelledby="swap-title">
      <div className="review__body">
        <header className="send-intro">
          <h2 id="swap-title" className="product-title">
            Swap assets
          </h2>
          <p className="product-body muted">
            Quotes come from a synthetic route. Rate, fees and slippage are estimates until confirmed.
          </p>
        </header>

        <div className="field">
          <label id="swap-from-label" htmlFor="swap-from" className="product-section option-group__legend">
            From
          </label>
          <Select
            id="swap-from"
            value={from.id}
            options={usable.map((asset) => ({
              value: asset.id,
              label: `${asset.symbol} · ${chainOf(asset.chain).name}`,
              hint: formatQty(asset.balanceRaw, asset.symbol),
              icon: <AssetIcon symbol={asset.symbol} name={asset.name} size="md" decorative />,
            }))}
            onChange={(next) => {
              onFrom(next)
              setTouched(false)
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="swap-amount" className="product-section option-group__legend">
            Amount
          </label>
          <div className="amount-field" data-invalid={amountError ? "true" : undefined}>
            {/* using <input>: the kit ships no Input component; C13 defines the amount field contract */}
            <input
              id="swap-amount"
              className="amount-field__input product-title tabular"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => onAmount(event.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
              onBlur={() => amount && setTouched(true)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? "swap-help swap-error" : "swap-help"}
            />
            <span className="amount-field__unit product-label">{from.symbol}</span>
            <button
              className="text-button product-label"
              type="button"
              onClick={() => {
                onAmount(String(from.balanceRaw))
                setTouched(true)
              }}
            >
              Max
            </button>
          </div>
          <p id="swap-help" className="amount-help product-meta muted">
            <span>Available {formatQty(from.balanceRaw, from.symbol)}</span>
            <span className="tabular">≈ {formatUsd(value * from.price)} estimate</span>
          </p>
          {amountError && (
            <p id="swap-error" className="field__error product-meta">
              {amountError}
            </p>
          )}
        </div>

        <div className="field">
          <label id="swap-to-label" htmlFor="swap-to" className="product-section option-group__legend">
            To
          </label>
          <Select
            id="swap-to"
            value={to.id}
            options={ASSETS.filter((asset) => enabled[asset.chain] && asset.id !== from.id).map((asset) => ({
              value: asset.id,
              label: `${asset.symbol} · ${chainOf(asset.chain).name}`,
              icon: <AssetIcon symbol={asset.symbol} name={asset.name} size="md" decorative />,
            }))}
            onChange={onTo}
          />
        </div>

        <div className="field">
          <p id="slippage-label" className="product-label">
            Slippage tolerance
          </p>
          <div className="segmented segmented--three" role="group" aria-labelledby="slippage-label">
            {SLIPPAGE_OPTIONS.map((option) => (
              <button
                key={option}
                className="segmented__item product-label"
                type="button"
                aria-pressed={slippage === option}
                onClick={() => onSlippage(option)}
              >
                {option}%
              </button>
            ))}
          </div>
        </div>

        {unsupported && (
          <Notice tone="warning" title="Route not supported" live>
            {unsupported}
          </Notice>
        )}
        {noLiquidity && (
          <Notice tone="warning" title="Not enough liquidity" live>
            The synthetic route can fill up to {formatUsd(LIQUIDITY_LIMIT_USD)} per swap. Lower the amount.
          </Notice>
        )}

        {quoteReady && breakdown && quote && (
          <section className="review-card" aria-labelledby="quote-title">
            <div className="quote-head">
              <h3 id="quote-title" className="product-label">
                Quote
              </h3>
              <span
                className={`row-status ${remaining > 0 ? "row-status--pending" : "row-status--failed"} product-meta`}
                role="timer"
                aria-live="off"
              >
                <Clock className="icon-inline" weight="regular" aria-hidden="true" />
                {remaining > 0 ? `Expires in ${remaining}s` : "Expired"}
              </span>
            </div>
            <QuoteRows from={from} to={to} breakdown={breakdown} rate={quote.rate} slippage={slippage} />
          </section>
        )}
        {quoteReady && remaining === 0 && (
          <Notice tone="warning" title="Quote expired" live>
            Prices may have moved. Get a new quote to see current terms.
          </Notice>
        )}
      </div>

      <footer className="review-footer review-footer--single">
        {quoteReady && remaining === 0 ? (
          <Button size="lg" block onClick={onQuote}>
            <ArrowClockwise weight="regular" aria-hidden="true" />
            Refresh quote
          </Button>
        ) : (
          <Button
            size="lg"
            block
            disabled={!!unsupported || noLiquidity}
            onClick={() => {
              setTouched(true)
              if (quoteReady) onContinue()
            }}
          >
            Review swap
            <ArrowRight weight="regular" aria-hidden="true" />
          </Button>
        )}
      </footer>
    </main>
  )
}

function useCountdown(quote: Quote | null) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!quote) return QUOTE_SECONDS
  return Math.max(0, QUOTE_SECONDS - Math.floor((now - quote.issuedAt) / 1000))
}

function swapBreakdown(from: Asset, to: Asset, value: number, rate: number, slippage: number) {
  const gross = value * rate
  const service = gross * SERVICE_FEE
  const out = gross - service
  return { out, service, min: out * (1 - slippage / 100), fee: feeFor(from) }
}

function QuoteRows({
  from,
  to,
  breakdown,
  rate,
  slippage,
}: {
  from: Asset
  to: Asset
  breakdown: ReturnType<typeof swapBreakdown>
  rate: number
  slippage: number
}) {
  return (
    <dl>
      <ReviewRow label="Estimated rate" inline>
        1 {from.symbol} ≈ {rate.toLocaleString("en-US", { maximumFractionDigits: 6 })} {to.symbol}
      </ReviewRow>
      <ReviewRow label="You receive (estimate)" inline>
        {formatQty(Number(breakdown.out.toFixed(6)), to.symbol)}
      </ReviewRow>
      <ReviewRow label="Minimum received" inline>
        {formatQty(Number(breakdown.min.toFixed(6)), to.symbol)}
        <span className="review-row__sub">At {slippage}% slippage</span>
      </ReviewRow>
      <ReviewRow label="Estimated network fee" inline>
        {formatQty(breakdown.fee.amount, breakdown.fee.symbol)}
        <span className="review-row__sub">≈ {formatUsd(breakdown.fee.usd)} estimate</span>
      </ReviewRow>
      <ReviewRow label="Service fee (0.3%)" inline>
        {formatQty(Number(breakdown.service.toFixed(6)), to.symbol)}
      </ReviewRow>
    </dl>
  )
}

function SwapReview({
  from,
  to,
  amount,
  slippage,
  quote,
  status,
  onRefresh,
  onSimulate,
  onCancel,
  onDone,
}: {
  from: Asset
  to: Asset
  amount: number
  slippage: number
  quote: Quote
  status: SimulationStatus
  onRefresh: () => void
  onSimulate: () => void
  onCancel: () => void
  onDone: () => void
}) {
  const remaining = useCountdown(quote)
  const breakdown = swapBreakdown(from, to, amount, quote.rate, slippage)
  const expired = remaining === 0 && status === "ready"

  return (
    <main className="review" aria-labelledby="swap-review-amount">
      <div className="review__body">
        <header className="review-hero">
          <span className="swap-pair" aria-hidden="true">
            <AssetIcon symbol={from.symbol} name={from.name} size="lg" decorative />
            <ArrowRight weight="regular" />
            <AssetIcon symbol={to.symbol} name={to.name} size="lg" decorative />
          </span>
          <span className="product-body muted">You're swapping</span>
          <p id="swap-review-amount" className="product-amount">
            {formatQty(amount, from.symbol)}
          </p>
          <p className="product-body muted">
            for about {formatQty(Number(breakdown.out.toFixed(6)), to.symbol)}
          </p>
        </header>

        <dl className="review-card">
          <ReviewRow label="Account">
            <span className="product-row">{ACCOUNT_NAME}</span>
            <span className="product-address review-address">{chainOf(from.chain).address}</span>
          </ReviewRow>
          <ReviewRow label="From" inline>
            {from.symbol} · {chainOf(from.chain).name}
          </ReviewRow>
          <ReviewRow label="To" inline>
            {to.symbol} · {chainOf(to.chain).name}
          </ReviewRow>
        </dl>

        <section className="review-card" aria-labelledby="swap-terms">
          <div className="quote-head">
            <h2 id="swap-terms" className="product-label">
              Final terms
            </h2>
            {status === "ready" && (
              <span className={`row-status ${remaining > 0 ? "row-status--pending" : "row-status--failed"} product-meta`} role="timer">
                <Clock className="icon-inline" weight="regular" aria-hidden="true" />
                {remaining > 0 ? `Expires in ${remaining}s` : "Expired"}
              </span>
            )}
          </div>
          <QuoteRows from={from} to={to} breakdown={breakdown} rate={quote.rate} slippage={slippage} />
        </section>

        {expired && (
          <Notice tone="warning" title="Quote expired" live>
            Refresh to check the latest rate before signing.
          </Notice>
        )}
        <StatusNotice status={status} />
      </div>

      {status === "confirmed" ? (
        <footer className="review-footer review-footer--single">
          <Button size="lg" block onClick={onDone}>
            <Check weight="regular" aria-hidden="true" />
            Done
          </Button>
        </footer>
      ) : (
        <footer className="review-footer">
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={status === "pending"}>
            Cancel
          </Button>
          {expired ? (
            <Button size="lg" onClick={onRefresh}>
              <ArrowClockwise weight="regular" aria-hidden="true" />
              Refresh quote
            </Button>
          ) : (
            <Button size="lg" onClick={onSimulate} busy={status === "pending"}>
              {status === "pending" ? (
                <Clock weight="regular" aria-hidden="true" />
              ) : (
                <ArrowsLeftRight weight="regular" aria-hidden="true" />
              )}
              {status === "pending" ? "Simulating…" : "Simulate swap"}
            </Button>
          )}
        </footer>
      )}
    </main>
  )
}

type Filters = { chain: "all" | ChainId; asset: string; type: "all" | TxType; status: "all" | TxStatus }

function Activity({
  txs,
  filters,
  onFilters,
  onOpenTx,
}: {
  txs: Tx[]
  filters: Filters
  onFilters: (filters: Filters) => void
  onOpenTx: (id: string) => void
}) {
  const filtered = txs.filter((tx) => {
    const asset = assetOf(tx.assetId)
    return (
      (filters.chain === "all" || asset.chain === filters.chain) &&
      (filters.asset === "all" || asset.symbol === filters.asset || assetOf(tx.toAssetId ?? "").symbol === filters.asset) &&
      (filters.type === "all" || tx.type === filters.type) &&
      (filters.status === "all" || tx.status === filters.status)
    )
  })
  const symbols = Array.from(new Set(ASSETS.map((asset) => asset.symbol)))
  const active = Object.values(filters).filter((value) => value !== "all").length

  const selects: { key: keyof Filters; label: string; options: [string, string][] }[] = [
    { key: "chain", label: "Network", options: [["all", "All networks"], ...CHAINS.map((c) => [c.id, c.name] as [string, string])] },
    { key: "asset", label: "Asset", options: [["all", "All assets"], ...symbols.map((s) => [s, s] as [string, string])] },
    { key: "type", label: "Type", options: [["all", "All types"], ["send", "Sent"], ["receive", "Received"], ["swap", "Swaps"]] },
    {
      key: "status",
      label: "Status",
      options: [["all", "All statuses"], ...(Object.keys(TX_STATUS_COPY) as TxStatus[]).map((s) => [s, TX_STATUS_COPY[s].label] as [string, string])],
    },
  ]

  return (
    <main className="home" aria-labelledby="activity-page-title">
      <header className="section-heading">
        <h1 id="activity-page-title" className="product-title">
          Activity
        </h1>
        <span className="product-meta muted">Newest first</span>
      </header>

      <fieldset className="filter-grid">
        <legend className="sr-only">Filter transactions</legend>
        {selects.map(({ key, label, options }) => (
          <div key={key} className="field">
            <label id={`filter-${key}-label`} htmlFor={`filter-${key}`} className="product-label">
              {label}
            </label>
            <Select
              id={`filter-${key}`}
              value={filters[key]}
              options={options.map(([value, text]) => ({ value, label: text }))}
              onChange={(next) => onFilters({ ...filters, [key]: next })}
            />
          </div>
        ))}
      </fieldset>

      <div className="section">
        <div className="section-heading">
          <p className="product-meta muted" role="status">
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
          </p>
          {active > 0 && (
            <button
              className="text-button product-label"
              type="button"
              onClick={() => onFilters({ chain: "all", asset: "all", type: "all", status: "all" })}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="reading-container">
          {filtered.length === 0 ? (
            <p className="empty-row product-body muted">No transactions match these filters.</p>
          ) : (
            groupByDay(filtered).map((group) => (
              <div key={group.label}>
                <p className="list-group-label product-meta">{group.label}</p>
                {group.items.map((tx) => (
                  <ActivityRow key={tx.id} tx={tx} onOpen={() => onOpenTx(tx.id)} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}

function TxDetail({
  tx,
  onCopy,
  onToast,
  onRecheck,
}: {
  tx: Tx
  onCopy: (text: string, label?: string) => void
  onToast: (message: string) => void
  onRecheck: () => void
}) {
  const asset = assetOf(tx.assetId)
  const chain = chainOf(asset.chain)
  const { label } = TX_STATUS_COPY[tx.status]
  const tone: NoticeTone =
    tx.status === "confirmed" ? "confirmed" : tx.status === "failed" ? "danger" : tx.status === "unknown" ? "unknown" : "warning"
  const [checks, setChecks] = useState(0)

  useEffect(() => {
    if (tx.status !== "unknown") return
    const id = window.setInterval(() => setChecks((value) => value + 1), 5000)
    return () => window.clearInterval(id)
  }, [tx.status])

  const statusBody = {
    confirmed: "The network recorded this transaction (synthetic).",
    pending: "Waiting for the network to include this transaction.",
    processing: "Included and waiting for confirmations.",
    failed: "The transaction was rejected. Funds did not leave your account; the network fee may have been charged.",
    unknown: `The status provider is delayed, so this isn't final yet. It is not a failure—do not send again. Checking automatically every 5 seconds${
      checks ? ` · checked ${checks} ${checks === 1 ? "time" : "times"}` : ""
    }.`,
  }[tx.status]

  return (
    <main className="review" aria-labelledby="tx-amount">
      <div className="review__body">
        <header className="review-hero">
          <AssetIcon symbol={asset.symbol} name={asset.name} size="lg" />
          <span className="product-body muted">{txTitle(tx)}</span>
          <p id="tx-amount" className="product-amount">
            {tx.type === "swap" ? formatQty(tx.amount, asset.symbol) : txAmount(tx)}
          </p>
          {tx.type === "swap" && <p className="product-body muted">for {txAmount(tx).slice(1)}</p>}
        </header>

        <Notice tone={tone} title={label} live>
          <p>{statusBody}</p>
          {tx.status === "unknown" && (
            <button className="text-button product-label inline-action" type="button" onClick={onRecheck}>
              <ArrowClockwise weight="regular" aria-hidden="true" />
              Check now
            </button>
          )}
        </Notice>

        <dl className="review-card">
          <ReviewRow label="Type" inline>
            {tx.type === "send" ? "Send" : tx.type === "receive" ? "Receive" : "Swap"}
          </ReviewRow>
          <ReviewRow label="Network" inline>
            {chain.name}
          </ReviewRow>
          <ReviewRow label="Asset" inline>
            {asset.symbol} · {asset.standard}
          </ReviewRow>
          <ReviewRow label="Network fee" inline>
            {tx.fee}
            <span className="review-row__sub">{tx.status === "confirmed" ? "Final (synthetic)" : "Estimate"}</span>
          </ReviewRow>
          <ReviewRow label="Requested" inline>
            {formatTime(tx.requestedAt)}
          </ReviewRow>
          <ReviewRow label="Confirmed" inline>
            {tx.confirmedAt ? formatTime(tx.confirmedAt) : "—"}
          </ReviewRow>
          <ReviewRow label={tx.type === "send" ? "To" : tx.type === "receive" ? "From" : "Route"}>
            <span className={tx.type === "swap" ? "product-body" : "product-address review-address"}>{tx.counterparty}</span>
          </ReviewRow>
          <ReviewRow label="Transaction ID">
            <span className="product-address review-address">{tx.id}</span>
            <span className="inline-actions">
              <button className="text-button product-label" type="button" onClick={() => onCopy(tx.id, "Transaction ID copied")}>
                <Copy weight="regular" aria-hidden="true" />
                Copy ID
              </button>
              <button
                className="text-button product-label"
                type="button"
                onClick={() => onToast(`Synthetic ID · ${chain.explorer} would not find it`)}
              >
                <ArrowSquareOut weight="regular" aria-hidden="true" />
                Block explorer
              </button>
            </span>
          </ReviewRow>
        </dl>
      </div>
    </main>
  )
}

type AuditEvent = { at: number; text: string }

function Settings({
  lock,
  rooted,
  enabled,
  audit,
  tronState,
  onLock,
  onLockNow,
  onRooted,
  onToggleChain,
  onSignOut,
}: {
  lock: boolean
  rooted: boolean
  enabled: Record<ChainId, boolean>
  audit: AuditEvent[]
  tronState: BalanceState
  onLock: (value: boolean) => void
  onLockNow: () => void
  onRooted: (value: boolean) => void
  onToggleChain: (id: ChainId, value: boolean) => void
  onSignOut: () => void
}) {
  const providers = [
    { name: "Ethereum RPC", state: "Operational" },
    { name: "Bitcoin indexer", state: "Operational" },
    { name: "Solana RPC", state: "Operational" },
    { name: "Tron balance provider", state: tronState === "ok" ? "Operational" : "Delayed" },
    { name: "XRP Ledger RPC", state: "Operational" },
    { name: "Price provider", state: "Operational" },
  ]

  return (
    <main className="home" aria-labelledby="settings-title">
      <h1 id="settings-title" className="product-title">
        Settings
      </h1>

      <div className="home-grid">
        <div className="settings-column">
          <section className="section" aria-labelledby="security-title">
            <h2 id="security-title" className="product-section">
              Security
            </h2>
            <div className="reading-container">
              <Switch
                checked={lock}
                label="App lock (simulated)"
                description="Ask for device authentication when opening VaultMe. No real biometrics are used."
                onChange={onLock}
              />
              <div className="setting-row">
                <span className="row-body">
                  <strong className="product-row">Lock now</strong>
                  <span className="product-body muted">Show the lock screen.</span>
                </span>
                <Button variant="secondary" onClick={onLockNow} disabled={!lock}>
                  <LockSimple weight="regular" aria-hidden="true" />
                  Lock
                </Button>
              </div>
              <Switch
                checked={rooted}
                label="Simulate rooted device"
                description="Preview the risk notice and the send/swap limits."
                onChange={onRooted}
              />
            </div>
            <Notice tone="info" title="Recovery phrase protection">
              Never screenshot, copy, share or type your recovery phrase into a website or chat. VaultMe never asks for
              it after setup.
            </Notice>
          </section>

          <section className="section" aria-labelledby="notices-title">
            <h2 id="notices-title" className="product-section">
              Notices
            </h2>
            <div className="reading-container">
              {NOTICES.map((notice) => (
                <article key={notice.title} className="setting-row setting-row--stack">
                  <strong className="product-row">{notice.title}</strong>
                  <span className="product-body muted">{notice.body}</span>
                  <span className="product-meta muted">{notice.date}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="vault-title">
            <h2 id="vault-title" className="product-section">
              Vault
            </h2>
            <div className="reading-container">
              <div className="setting-row">
                <span className="row-body">
                  <strong className="product-row">Remove sample vault</strong>
                  <span className="product-body muted">Return to onboarding. Synthetic data is reset.</span>
                </span>
                <Button variant="secondary" onClick={onSignOut}>
                  Remove
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-column">
          <section className="section" aria-labelledby="admin-title">
            <div className="section-heading">
              <h2 id="admin-title" className="product-section">
                Operations (admin)
              </h2>
              <span className="product-meta muted">No key access</span>
            </div>
            <p className="product-body muted">
              Operators manage supported networks and providers. They can't see recovery phrases, private keys or raw
              signing data.
            </p>
            <div className="reading-container">
              {CHAINS.map((chain) => (
                <Switch
                  key={chain.id}
                  checked={enabled[chain.id]}
                  label={chain.name}
                  description={`${ASSETS.filter((asset) => asset.chain === chain.id)
                    .map((asset) => asset.symbol)
                    .join(", ")} · ${enabled[chain.id] ? "Active" : "Paused"}`}
                  onChange={(value) => onToggleChain(chain.id, value)}
                />
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="providers-title">
            <h2 id="providers-title" className="product-section">
              Provider status (simulated)
            </h2>
            <div className="reading-container">
              {providers.map((provider) => (
                <div key={provider.name} className="setting-row">
                  <span className="product-row">{provider.name}</span>
                  <span
                    className={`row-status row-status--${provider.state === "Operational" ? "confirmed" : "pending"} product-body`}
                  >
                    {provider.state === "Operational" ? (
                      <CheckCircle className="icon-inline" weight="regular" aria-hidden="true" />
                    ) : (
                      <Warning className="icon-inline" weight="regular" aria-hidden="true" />
                    )}
                    {provider.state}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="audit-title">
            <h2 id="audit-title" className="product-section">
              Audit log
            </h2>
            <div className="reading-container">
              {audit.length === 0 ? (
                <p className="empty-row product-body muted">No events yet.</p>
              ) : (
                <ol className="audit-list">
                  {audit.slice(0, 12).map((event, index) => (
                    <li key={`${event.at}-${index}`} className="setting-row setting-row--stack">
                      <span className="product-body">{event.text}</span>
                      <span className="product-meta muted">{formatTime(event.at)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [busy, setBusy] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return (
    <main className="onboarding" aria-labelledby="lock-title">
      <div className="onboarding__body lock-body">
        <span className="feature-icon lock-icon" aria-hidden="true">
          <LockSimple weight="regular" />
        </span>
        <div className="onboarding__hero">
          <span className="onboarding__brand product-section">VaultMe</span>
          <h1 id="lock-title" className="product-title">
            VaultMe is locked
          </h1>
          <p className="product-body muted">Unlock with device authentication. This prototype simulates the check.</p>
        </div>
      </div>
      <footer className="onboarding__footer">
        <Button
          size="lg"
          block
          busy={busy}
          onClick={() => {
            setBusy(true)
            timerRef.current = window.setTimeout(onUnlock, 900)
          }}
        >
          <LockSimple weight="regular" aria-hidden="true" />
          {busy ? "Checking…" : "Unlock (simulated)"}
        </Button>
      </footer>
    </main>
  )
}

const DEFAULT_ENABLED: Record<ChainId, boolean> = { ethereum: true, bitcoin: true, solana: true, tron: true, xrpl: true }

function randomHex(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("")
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding")
  const [history, setHistory] = useState<Screen[]>([])
  const [backup, setBackup] = useState<"created" | "imported">("created")
  const [lock, setLock] = useState(false)
  const [rooted, setRooted] = useState(false)
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED)
  const [balances, setBalances] = useState<Asset[]>(ASSETS)
  const [tronState, setTronState] = useState<BalanceState>("error")
  const [tronUpdated, setTronUpdated] = useState(() => Date.now() - 18 * 60_000)
  const [txs, setTxs] = useState<Tx[]>(SEED_TXS)
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [filters, setFilters] = useState<Filters>({ chain: "all", asset: "all", type: "all", status: "all" })
  const [assetDetailId, setAssetDetailId] = useState("eth")
  const [txDetailId, setTxDetailId] = useState("")
  const [receiveChain, setReceiveChain] = useState<ChainId>("ethereum")

  const [status, setStatus] = useState<SimulationStatus>("ready")
  const [networkId, setNetworkId] = useState<ChainId>("ethereum")
  const [assetId, setAssetId] = useState("eth")
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [sendTxId, setSendTxId] = useState<string | undefined>()

  const [swapFrom, setSwapFrom] = useState("sol")
  const [swapTo, setSwapTo] = useState("usdc-sol")
  const [swapAmount, setSwapAmount] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [swapStatus, setSwapStatus] = useState<SimulationStatus>("ready")

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const toastRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      window.clearTimeout(toastRef.current)
    },
    [],
  )

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
    setScrolled(false)
  }, [screen])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function showToast(message: string) {
    window.clearTimeout(toastRef.current)
    setToast(message)
    toastRef.current = window.setTimeout(() => setToast(null), 2600)
  }

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  function log(text: string) {
    setAudit((events) => [{ at: Date.now(), text }, ...events])
  }

  const copy = useCopy(showToast)
  const sorted = useMemo(() => [...txs].sort((a, b) => b.requestedAt - a.requestedAt), [txs])
  const liveAsset = (id: string) => balances.find((item) => item.id === id) ?? balances[0]
  const sendAsset = liveAsset(assetId)

  function go(next: Screen, push = true) {
    if (push && next !== screen) setHistory((stack) => [...stack, screen])
    setScreen(next)
  }

  function back() {
    const previous = history[history.length - 1] ?? "home"
    setHistory((stack) => stack.slice(0, -1))
    setScreen(previous)
  }

  function navigate(next: Screen) {
    setHistory([])
    if (next === "send" && status === "confirmed") resetSend()
    if (next === "swap" && swapStatus === "confirmed") resetSwap()
    setScreen(next)
  }

  function resetSend() {
    setStatus("ready")
    setAmount("")
    setRecipient("")
    setSendTxId(undefined)
  }

  function resetSwap() {
    setSwapStatus("ready")
    setSwapAmount("")
    setQuote(null)
  }

  function updateTx(id: string, patch: Partial<Tx>) {
    setTxs((list) => list.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)))
  }

  function adjustBalance(id: string, delta: number) {
    setBalances((list) =>
      list.map((asset) => (asset.id === id ? { ...asset, balanceRaw: Number((asset.balanceRaw + delta).toFixed(8)) } : asset)),
    )
  }

  function simulateSend() {
    if (status !== "ready") return
    const fee = feeFor(sendAsset)
    const value = Number(amount)
    const id = sendAsset.chain === "ethereum" ? `0x${randomHex(64)}` : randomHex(64)
    setSendTxId(id)
    setStatus("pending")
    setTxs((list) => [
      {
        id,
        type: "send",
        assetId: sendAsset.id,
        amount: value,
        counterparty: recipient,
        fee: formatQty(fee.amount, fee.symbol),
        status: "pending",
        requestedAt: Date.now(),
      },
      ...list,
    ])
    later(() => {
      setStatus("confirmed")
      updateTx(id, { status: "confirmed", confirmedAt: Date.now() })
      adjustBalance(sendAsset.id, -value)
      if (fee.feeAsset) adjustBalance(fee.feeAsset.id, -fee.amount)
    }, 1600)
  }

  function refreshQuote() {
    const from = liveAsset(swapFrom)
    const to = assetOf(swapTo)
    const drift = 1 + (Math.random() - 0.5) * 0.008
    setQuote({ rate: (from.price / to.price) * drift, issuedAt: Date.now() })
  }

  function simulateSwap() {
    if (swapStatus !== "ready" || !quote) return
    const from = liveAsset(swapFrom)
    const to = assetOf(swapTo)
    const value = Number(swapAmount)
    const breakdown = swapBreakdown(from, to, value, quote.rate, slippage)
    const id = randomHex(64)
    setSwapStatus("pending")
    setTxs((list) => [
      {
        id,
        type: "swap",
        assetId: from.id,
        toAssetId: to.id,
        amount: value,
        toAmount: Number(breakdown.out.toFixed(6)),
        counterparty: "Synthetic swap route",
        fee: `${formatQty(breakdown.fee.amount, breakdown.fee.symbol)} + ${formatQty(Number(breakdown.service.toFixed(6)), to.symbol)}`,
        status: "pending",
        requestedAt: Date.now(),
      },
      ...list,
    ])
    later(() => {
      setSwapStatus("confirmed")
      updateTx(id, { status: "confirmed", confirmedAt: Date.now() })
      adjustBalance(from.id, -value)
      adjustBalance(to.id, Number(breakdown.out.toFixed(6)))
    }, 1600)
  }

  function retryTron() {
    setTronState("loading")
    later(() => {
      setTronState("ok")
      setTronUpdated(Date.now())
      log("Tron balance provider recovered after retry")
    }, 1200)
  }

  function signOut() {
    setScreen("onboarding")
    setHistory([])
    setBalances(ASSETS)
    setTxs(SEED_TXS)
    setTronState("error")
    resetSend()
    resetSwap()
    setLock(false)
    setRooted(false)
    setEnabled(DEFAULT_ENABLED)
    setAudit([])
  }

  if (screen === "onboarding") {
    return (
      <div className="onboarding-shell">
        <Onboarding
          onComplete={(result) => {
            setBackup(result.mode)
            setLock(result.lock)
            setAudit([
              { at: Date.now(), text: result.mode === "created" ? "Wallet created; sample phrase verified" : "Wallet imported from phrase (sample vault)" },
              ...(result.lock ? [{ at: Date.now(), text: "App lock turned on" }] : []),
              { at: Date.now(), text: "Tron balance provider timed out" },
            ])
            setScreen("home")
          }}
        />
      </div>
    )
  }

  if (screen === "locked") {
    return (
      <div className="onboarding-shell">
        <LockScreen
          onUnlock={() => {
            log("App unlocked (simulated authentication)")
            setScreen(history[history.length - 1] ?? "home")
            setHistory((stack) => stack.slice(0, -1))
          }}
        />
      </div>
    )
  }

  const txDetail = txs.find((tx) => tx.id === txDetailId)
  const openTx = (id: string) => {
    setTxDetailId(id)
    go("tx")
  }

  return (
    <div className="app-shell">
      <AppBar
        screen={screen}
        scrolled={scrolled}
        menuOpen={menuOpen}
        onBack={back}
        onReceive={() => go("receive")}
        onMenu={() => setMenuOpen(true)}
      />
      <Drawer
        open={menuOpen}
        screen={screen}
        onClose={closeMenu}
        onGo={(next) => {
          setMenuOpen(false)
          if (next === "receive") go("receive")
          else navigate(next)
        }}
      />
      <div ref={contentRef} className="content" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}>
        {screen === "home" && (
          <Home
            balances={balances}
            tronState={tronState}
            tronUpdated={tronUpdated}
            enabled={enabled}
            txs={sorted}
            backup={backup}
            rooted={rooted}
            onRetryTron={retryTron}
            onOpenAsset={(id) => {
              setAssetDetailId(id)
              go("asset")
            }}
            onOpenTx={openTx}
            onNavigate={(next) => {
              if (next === "send" && status === "confirmed") resetSend()
              if (next === "swap" && swapStatus === "confirmed") resetSwap()
              if (next === "activity") navigate("activity")
              else go(next)
            }}
          />
        )}
        {screen === "asset" && (
          <AssetDetail
            asset={liveAsset(assetDetailId)}
            balanceState={liveAsset(assetDetailId).chain === "tron" ? tronState : "ok"}
            tronUpdated={tronUpdated}
            enabled={enabled[liveAsset(assetDetailId).chain]}
            rooted={rooted}
            txs={sorted}
            onCopy={copy}
            onOpenTx={openTx}
            onSend={() => {
              const target = liveAsset(assetDetailId)
              if (status !== "ready") resetSend()
              setNetworkId(target.chain)
              setAssetId(target.id)
              setAmount("")
              go("send")
            }}
            onReceive={() => {
              setReceiveChain(liveAsset(assetDetailId).chain)
              go("receive")
            }}
            onSwap={() => {
              const target = liveAsset(assetDetailId)
              resetSwap()
              setSwapFrom(target.id)
              const pair = ASSETS.find((item) => item.chain === target.chain && item.id !== target.id)
              if (pair) setSwapTo(pair.id)
              go("swap")
            }}
          />
        )}
        {screen === "receive" && (
          <Receive
            chainId={enabled[receiveChain] ? receiveChain : (CHAINS.find((c) => enabled[c.id])?.id ?? "ethereum")}
            enabled={enabled}
            onChain={setReceiveChain}
            onCopy={copy}
            onToast={showToast}
          />
        )}
        {screen === "send" && (
          <SendSelect
            networkId={enabled[networkId] ? networkId : (CHAINS.find((c) => enabled[c.id])?.id ?? "ethereum")}
            assetId={assetId}
            amount={amount}
            recipient={recipient}
            balances={balances}
            enabled={enabled}
            rooted={rooted}
            onNetwork={(id) => {
              setNetworkId(id)
              setAssetId(balances.find((item) => item.chain === id)?.id ?? "eth")
              setAmount("")
              setRecipient("")
            }}
            onAsset={(id) => {
              setAssetId(id)
              setAmount("")
            }}
            onAmount={setAmount}
            onRecipient={setRecipient}
            onContinue={() => go("review")}
            onToast={showToast}
          />
        )}
        {screen === "review" && (
          <SendReview
            asset={sendAsset}
            amount={Number(amount) || 0}
            recipient={recipient}
            status={status}
            txId={sendTxId}
            onSimulate={simulateSend}
            onCancel={back}
            onDone={() => {
              resetSend()
              navigate("home")
            }}
            onViewTx={() => {
              const id = sendTxId ?? ""
              resetSend()
              setHistory([])
              setTxDetailId(id)
              setScreen("tx")
            }}
          />
        )}
        {screen === "swap" && (
          <Swap
            fromId={swapFrom}
            toId={swapTo}
            amount={swapAmount}
            slippage={slippage}
            quote={quote}
            balances={balances}
            enabled={enabled}
            rooted={rooted}
            onFrom={(id) => {
              setSwapFrom(id)
              if (id === swapTo) {
                const other = ASSETS.find((asset) => asset.id !== id && enabled[asset.chain])
                if (other) setSwapTo(other.id)
              }
              setSwapAmount("")
              setQuote(null)
            }}
            onTo={(id) => {
              setSwapTo(id)
              setQuote(null)
            }}
            onAmount={setSwapAmount}
            onSlippage={setSlippage}
            onQuote={refreshQuote}
            onContinue={() => go("swap-review")}
          />
        )}
        {screen === "swap-review" && quote && (
          <SwapReview
            from={liveAsset(swapFrom)}
            to={assetOf(swapTo)}
            amount={Number(swapAmount) || 0}
            slippage={slippage}
            quote={quote}
            status={swapStatus}
            onRefresh={refreshQuote}
            onSimulate={simulateSwap}
            onCancel={back}
            onDone={() => {
              resetSwap()
              navigate("activity")
            }}
          />
        )}
        {screen === "activity" && <Activity txs={sorted} filters={filters} onFilters={setFilters} onOpenTx={openTx} />}
        {screen === "tx" && txDetail && (
          <TxDetail
            key={txDetail.id}
            tx={txDetail}
            onCopy={copy}
            onToast={showToast}
            onRecheck={() => {
              showToast("Still not final · checking again automatically")
              log(`Status re-check requested for ${shortAddress(txDetail.id)}`)
            }}
          />
        )}
        {screen === "settings" && (
          <Settings
            lock={lock}
            rooted={rooted}
            enabled={enabled}
            audit={audit}
            tronState={tronState}
            onLock={(value) => {
              setLock(value)
              log(`App lock turned ${value ? "on" : "off"}`)
            }}
            onLockNow={() => {
              log("App locked manually")
              go("locked")
            }}
            onRooted={(value) => {
              setRooted(value)
              log(value ? "Rooted/jailbroken device detected (simulated) · send and swap limited" : "Device check passed (simulated)")
            }}
            onToggleChain={(id, value) => {
              setEnabled((current) => ({ ...current, [id]: value }))
              log(`Admin ${value ? "activated" : "paused"} ${chainOf(id).name}`)
            }}
            onSignOut={signOut}
          />
        )}
      </div>
      <Navigation screen={screen} onNavigate={navigate} />
      {toast && (
        <div className="toast product-label" role="status">
          {/copied|opened/i.test(toast) ? (
            <Check weight="regular" aria-hidden="true" />
          ) : (
            <Info weight="regular" aria-hidden="true" />
          )}
          {toast}
        </div>
      )}
    </div>
  )
}
