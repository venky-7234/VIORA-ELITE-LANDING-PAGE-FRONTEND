import React, { useState, useEffect } from "react";
import { motion as motionFramer, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, ChevronDown, AlertCircle, Check, Search, X } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import { submitApplication, ValidationError, fetchEvents } from '../../services/api';
import toast from 'react-hot-toast';

interface ApplicationPageProps {
  onSubmit: () => void;
  onBack: () => void;
  eventId?: string;
}

// ── Country Code List with Vector Flag ISO Codes ──────────────────────────────
export interface CountryOption {
  code: string;
  iso: string;
  name: string;
}

export const COUNTRY_CODES: CountryOption[] = [
  { code: "+91", iso: "IN", name: "India" },
  { code: "+1", iso: "US", name: "United States" },
  { code: "+44", iso: "GB", name: "United Kingdom" },
  { code: "+971", iso: "AE", name: "United Arab Emirates" },
  { code: "+65", iso: "SG", name: "Singapore" },
  { code: "+60", iso: "MY", name: "Malaysia" },
  { code: "+61", iso: "AU", name: "Australia" },
  { code: "+49", iso: "DE", name: "Germany" },
  { code: "+33", iso: "FR", name: "France" },
  { code: "+81", iso: "JP", name: "Japan" },
  { code: "+82", iso: "KR", name: "South Korea" },
  { code: "+86", iso: "CN", name: "China" },
  { code: "+7", iso: "RU", name: "Russia" },
  { code: "+55", iso: "BR", name: "Brazil" },
  { code: "+27", iso: "ZA", name: "South Africa" },
  { code: "+234", iso: "NG", name: "Nigeria" },
  { code: "+254", iso: "KE", name: "Kenya" },
  { code: "+20", iso: "EG", name: "Egypt" },
  { code: "+92", iso: "PK", name: "Pakistan" },
  { code: "+880", iso: "BD", name: "Bangladesh" },
  { code: "+94", iso: "LK", name: "Sri Lanka" },
  { code: "+977", iso: "NP", name: "Nepal" },
  { code: "+966", iso: "SA", name: "Saudi Arabia" },
  { code: "+974", iso: "QA", name: "Qatar" },
  { code: "+973", iso: "BH", name: "Bahrain" },
  { code: "+968", iso: "OM", name: "Oman" },
  { code: "+962", iso: "JO", name: "Jordan" },
  { code: "+90", iso: "TR", name: "Turkey" },
  { code: "+98", iso: "IR", name: "Iran" },
  { code: "+62", iso: "ID", name: "Indonesia" },
  { code: "+63", iso: "PH", name: "Philippines" },
  { code: "+84", iso: "VN", name: "Vietnam" },
  { code: "+66", iso: "TH", name: "Thailand" },
  { code: "+64", iso: "NZ", name: "New Zealand" },
  { code: "+353", iso: "IE", name: "Ireland" },
  { code: "+34", iso: "ES", name: "Spain" },
  { code: "+39", iso: "IT", name: "Italy" },
  { code: "+31", iso: "NL", name: "Netherlands" },
  { code: "+46", iso: "SE", name: "Sweden" },
  { code: "+41", iso: "CH", name: "Switzerland" },
  { code: "+32", iso: "BE", name: "Belgium" },
  { code: "+48", iso: "PL", name: "Poland" },
  { code: "+52", iso: "MX", name: "Mexico" },
  { code: "+54", iso: "AR", name: "Argentina" },
];

interface CountryFlagProps {
  iso: string;
  name: string;
  className?: string;
}

const CountryFlag: React.FC<CountryFlagProps> = ({ iso, name, className = "w-5 h-3.5" }) => {
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ title?: string; 'aria-label'?: string; className?: string }>>)[iso];
  if (!FlagComponent) return null;
  return (
    <span
      className={`${className} inline-flex items-center justify-center flex-shrink-0 overflow-hidden rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-white/15 bg-[#1A1A1A]`}
      aria-label={`${name} flag`}
    >
      <FlagComponent
        title={name}
        className="w-full h-full object-cover block"
      />
    </span>
  );
};

// ── Annual Turnover Enum Options ──────────────────────────────────────────────
const ANNUAL_TURNOVER_OPTIONS = [
  { value: "TEN_TO_FIFTY_LAKHS", label: "₹10L - ₹50L" },
  { value: "FIFTY_LAKHS_TO_ONE_CR", label: "₹50L - ₹1CR" },
  { value: "ONE_TO_FIVE_CR", label: "₹1CR - ₹5CR" },
  { value: "FIVE_TO_TEN_CR", label: "₹5CR - ₹10CR" },
  { value: "TEN_TO_TWENTY_FIVE_CR", label: "₹10CR - ₹25CR" },
  { value: "TWENTY_FIVE_TO_FIFTY_CR", label: "₹25CR - ₹50CR" },
  { value: "FIFTY_TO_SEVENTY_FIVE_CR", label: "₹50CR - ₹75CR" },
  { value: "SEVENTY_FIVE_TO_ONE_HUNDRED_CR", label: "₹75CR - ₹100CR" },
  { value: "ABOVE_ONE_HUNDRED_CR", label: "₹100CR+" },
];

// ── Validation helpers ────────────────────────────────────────────────────────
const ALPHA_RE = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_RE = /^[0-9\s\-]*$/;
const URL_RE = /^https?:\/\/.+/i;
const LINKEDIN_RE = /^https?:\/\/([a-zA-Z]{2,3}\.)?linkedin\.com\/.+/i;

type FieldErrors = Record<string, string>;

// ── Sub-components ────────────────────────────────────────────────────────────

const inputBase = (err?: string) =>
  `w-full bg-[#0A0A0A]/60 border ${err ? "border-red-500/50" : "border-[#D4AF37]/15"} focus:border-[#D4AF37] py-3 px-4 rounded-lg text-sm text-[#F5F5F5] placeholder-[#BDBDBD]/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all`;

const textareaBase = (err?: string) =>
  `w-full bg-[#0A0A0A]/60 border ${err ? "border-red-500/50" : "border-[#D4AF37]/15"} focus:border-[#D4AF37] py-3.5 px-4 rounded-lg text-sm text-[#F5F5F5] placeholder-[#BDBDBD]/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all resize-none`;

interface FieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  counter?: { current: number; max: number };
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ id, label, required, error, hint, counter, children }) => {
  const hintId = id ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5 relative">
      {/* Label row */}
      <div className="flex items-center justify-between px-1">
        <label htmlFor={id} className="text-xs sm:text-sm font-medium text-[#F5F5F5] tracking-wide">
          {label} {required && <span className="text-[#D4AF37] ml-0.5">*</span>}
        </label>
        {counter && (
          <span className={`text-[10px] sm:text-xs font-sans tabular-nums ${counter.current > counter.max * 0.9 ? "text-amber-400/80" : "text-[#BDBDBD]/40"}`}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {hint && <p id={hintId} className="sr-only">{hint}</p>}
      {/* Input / control */}
      {children}
      {/* Inline validation error */}
      <AnimatePresence>
        {error && (
          <motionFramer.p
            key="fe"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 text-red-400/80 text-[10px] font-sans px-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle size={10} className="flex-shrink-0" />
            {error}
          </motionFramer.p>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CountrySelectProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
}

const CountrySelect: React.FC<CountrySelectProps> = ({ id, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selected = COUNTRY_CODES.find(c => c.code === value) ?? COUNTRY_CODES[0];

  const filteredCountries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.includes(q) || c.iso.toLowerCase().includes(q)
    );
  }, [search]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Scroll focused item into view
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[focusedIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [open, focusedIndex]);

  // Focus search input on open
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch("");
    }
  }, [open]);

  // Reset focus to selected item when opening
  const handleOpen = () => {
    const idx = COUNTRY_CODES.findIndex(c => c.code === value);
    setFocusedIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filteredCountries.length > 0) {
          setFocusedIndex(i => (i + 1) % filteredCountries.length);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filteredCountries.length > 0) {
          setFocusedIndex(i => (i - 1 + filteredCountries.length) % filteredCountries.length);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCountries[focusedIndex]) {
          handleSelect(filteredCountries[focusedIndex].code);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country calling code: ${selected.name} ${selected.code}`}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 bg-[#0A0A0A]/80 border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] px-3 py-3 h-full rounded-lg text-sm text-[#F5F5F5] focus:outline-none transition-all cursor-pointer select-none whitespace-nowrap"
      >
        <CountryFlag iso={selected.iso} name={selected.name} className="w-5 h-3.5" />
        <span className="font-sans text-xs text-[#D4AF37] font-medium">{selected.code}</span>
        <ChevronDown
          size={12}
          className={`text-[#D4AF37]/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[290px] sm:w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#0F0F0F] shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md flex flex-col">
          {/* Quick search filter */}
          <div className="p-2 border-b border-[#D4AF37]/15 bg-[#0A0A0A]/60 flex items-center gap-2">
            <Search size={13} className="text-[#D4AF37]/50 flex-shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search country or code..."
              className="w-full bg-transparent text-xs text-[#F5F5F5] placeholder-[#BDBDBD]/35 focus:outline-none py-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFocusedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="text-[#BDBDBD]/50 hover:text-[#F5F5F5] p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Country codes"
            className="overflow-y-auto max-h-60 py-1 scrollbar-thin divide-y divide-white/[0.02]"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-[#BDBDBD]/40 italic">
                No matching country found
              </li>
            ) : (
              filteredCountries.map((c, i) => {
                const isSelected = c.code === value;
                const isFocused = i === focusedIndex;
                return (
                  <li
                    key={`${c.iso}-${c.code}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setFocusedIndex(i)}
                    onClick={() => handleSelect(c.code)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-100 select-none
                      ${isFocused ? "bg-[#D4AF37]/15 text-[#F5F5F5]" : isSelected ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-[#F5F5F5]/85 hover:bg-[#D4AF37]/10 hover:text-[#F5F5F5]"}`}
                  >
                    <CountryFlag iso={c.iso} name={c.name} className="w-5 h-3.5" />
                    <span className="flex-1 font-sans text-xs truncate tracking-wide">{c.name}</span>
                    <span className={`font-sans text-xs tabular-nums font-medium ${isSelected ? "text-[#D4AF37]" : "text-[#BDBDBD]/50"}`}>
                      {c.code}
                    </span>
                    {isSelected && (
                      <Check size={12} className="text-[#D4AF37] flex-shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const Divider: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="col-span-1 sm:col-span-2 pt-2">
    <div className="flex items-center gap-3">
      <div className="h-[1px] w-4 bg-[#D4AF37]/50" />
      <span className="font-serif text-[10px] tracking-[0.35em] text-[#D4AF37]/60 uppercase whitespace-nowrap">{title}</span>
      <div className="h-[1px] flex-1 bg-[#D4AF37]/10" />
    </div>
    {subtitle && (
      <p className="mt-1 ml-8 text-[9px] text-[#BDBDBD]/35 font-sans italic">{subtitle}</p>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const ApplicationPage: React.FC<ApplicationPageProps> = ({ onSubmit, onBack, eventId }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [form, setForm] = useState({
    name: "",
    phoneCountryCode: "+91",
    contactNumber: "",
    notes: "",
    email: "",
    whatsappCountryCode: "+91",
    whatsapp: "",
    company: "",
    journey: "",
    linkedinUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    websiteUrl: "",
    annualTurnover: "",
    whatValue: "",
    tribe: "",
    referredBy: "",
    confirmed: false,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | number | null>(null);
  const [eventAvailability, setEventAvailability] = useState<'loading' | 'active' | 'ended'>('loading');

  // Resolve this landing page to its configured event and require it to be active.
  useEffect(() => {
    fetchEvents(undefined, 0, 10)
      .then((res: any) => {
        const events: any[] = Array.isArray(res) ? res : (res?.data?.content || res?.content || res?.data || res?.events || []);
        const configuredEventId = String(eventId || '').trim();
        const activeEvent = events.find(
          (event: any) => {
            const isActive = String(event.status || event.event_status || '').toUpperCase() === 'ACTIVE';
            if (!isActive) return false;
            if (!configuredEventId) return true;
            return [event.publicId, event.id]
              .filter(value => value !== undefined && value !== null)
              .some(value => String(value) === configuredEventId);
          }
        );
        if (activeEvent) {
          setActiveEventId(activeEvent.publicId || activeEvent.id || null);
          setEventAvailability('active');
        } else {
          setActiveEventId(null);
          setEventAvailability('ended');
          toast.error('Applications for this event have ended.');
        }
      })
      .catch(() => {
        setActiveEventId(null);
        setEventAvailability('ended');
        toast.error('Applications for this event have ended.');
      });
  }, [eventId]);

  // Field setter — clears error for that field on edit
  const set = (key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => {
      const n = { ...prev };
      delete n[key];
      if (['linkedinUrl', 'instagramUrl', 'facebookUrl', 'websiteUrl'].includes(key)) {
        delete n.digitalDoor;
      }
      return n;
    });
    setGlobalError("");
  };

  const onText = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(e.target.name, e.target.value);

  // Allow only alphabetic characters (plus space, hyphen, apostrophe)
  const onAlphaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ["Backspace", "Tab", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", " ", "'", "-"];
    if (!pass.includes(e.key) && !/^[a-zA-ZÀ-ÿ]$/.test(e.key)) e.preventDefault();
  };

  // Allow only digit characters (plus backspace/nav)
  const onDigitKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ["Backspace", "Tab", "Delete", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!pass.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
  };

  // ── Client validation ─────────────────────────────────────────────────────
  const validate = (): FieldErrors => {
    const e: FieldErrors = {};

    if (!form.name.trim())
      e.name = "Please enter your name.";
    else if (!ALPHA_RE.test(form.name.trim()))
      e.name = "Please enter a valid name using alphabets only.";

    if (!form.email.trim())
      e.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(form.email.trim()))
      e.email = "Please enter a valid email address.";

    if (form.contactNumber.trim() && !DIGITS_RE.test(form.contactNumber))
      e.contactNumber = "Phone number must contain digits only.";
    if (form.contactNumber.replace(/\D/g, "").length > 0 &&
      form.contactNumber.replace(/\D/g, "").length < 4)
      e.contactNumber = "Phone number must be at least 4 digits.";

    if (form.whatsapp.trim() && !DIGITS_RE.test(form.whatsapp))
      e.whatsapp = "WhatsApp number must contain digits only.";

    if (form.notes.length > 1000) e.notes = "Note must not exceed 1000 characters.";
    if (form.company.length > 150) e.company = "Company name must not exceed 150 characters.";
    if (form.journey.length > 2000) e.journey = "Journey text must not exceed 2000 characters.";
    if (form.whatValue.length > 2000) e.whatValue = "Response must not exceed 2000 characters.";

    if (!form.confirmed)
      e.confirmed = "Please confirm the declaration before submitting.";

    // ── The Digital Door validation (at least one required) ───────────────────
    const hasSocial =
      form.linkedinUrl.trim() ||
      form.instagramUrl.trim() ||
      form.facebookUrl.trim() ||
      form.websiteUrl.trim();

    if (!hasSocial) {
      e.digitalDoor = "Please provide at least one of your LinkedIn, Instagram, Facebook, or Website details.";
    }

    if (form.linkedinUrl.trim() && !LINKEDIN_RE.test(form.linkedinUrl.trim()))
      e.linkedinUrl = "Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/...).";

    if (form.instagramUrl.trim() && !URL_RE.test(form.instagramUrl.trim()))
      e.instagramUrl = "Please enter a valid URL starting with https://.";
    if (form.facebookUrl.trim() && !URL_RE.test(form.facebookUrl.trim()))
      e.facebookUrl = "Please enter a valid URL starting with https://.";
    if (form.websiteUrl.trim() && !URL_RE.test(form.websiteUrl.trim()))
      e.websiteUrl = "Please enter a valid URL starting with https://.";

    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (eventAvailability !== 'active' || !activeEventId) {
      const message = 'Applications for this event have ended.';
      setGlobalError(message);
      toast.error(message);
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError("Please correct the highlighted fields and try again.");
      document.querySelector("[data-has-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setGlobalError("");

    try {
      await submitApplication({
        name: form.name.trim(),
        eventId: activeEventId ?? undefined,
        phoneCountryCode: form.phoneCountryCode,
        contactNumber: form.contactNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        email: form.email.trim().toLowerCase(),
        whatsappCountryCode: form.whatsappCountryCode,
        whatsapp: form.whatsapp.trim() || undefined,
        company: form.company.trim() || undefined,
        journey: form.journey.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        instagramUrl: form.instagramUrl.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        annualTurnover: form.annualTurnover || undefined,
        whatValue: form.whatValue.trim() || undefined,
        tribe: form.tribe.trim() || undefined,
        referredBy: form.referredBy.trim() || undefined,
        confirmed: form.confirmed,
      });
      setSubmitted(true);
      setTimeout(() => onSubmit(), 700);
    } catch (err: unknown) {
      const message = (err as Error).message || "An error occurred. Please try again.";

      if (message.toLowerCase().includes('applications for this event have ended')) {
        setActiveEventId(null);
        setEventAvailability('ended');
        toast.error('Applications for this event have ended.');
      }

      if (err instanceof ValidationError) {
        setFieldErrors(err.fieldErrors);
        setGlobalError("Some fields need attention — please review and try again.");
      } else {
        setGlobalError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#F5F5F5] font-sans flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-20 relative overflow-x-hidden">

      {/* Ambient glow */}
      <div className="absolute top-[15%] left-[-12%] w-[380px] h-[380px] rounded-full bg-[#D4AF37]/4 blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-[15%] right-[-12%] w-[380px] h-[380px] rounded-full bg-[#D4AF37]/3 blur-[160px] pointer-events-none z-0" />

      {/* Back button */}
      <motionFramer.button
        onClick={onBack}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        className="fixed bottom-6 left-6 sm:bottom-10 sm:left-10 z-50 group flex items-center justify-center p-3 sm:p-4 rounded-full border border-[#D4AF37]/20 bg-[#0A0A0A]/80 backdrop-blur-sm hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:scale-95 transition-all duration-300"
        aria-label="Go back"
      >
        <ArrowLeft size={18} className="text-[#D4AF37]/80 group-hover:text-[#F6D365] group-hover:-translate-x-1 transition-all duration-300" />
      </motionFramer.button>

      <motionFramer.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl rounded-2xl p-6 sm:p-10 border border-[#D4AF37]/15 shadow-2xl bg-[#1A1515]/60 mt-4 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#F5F5F5] tracking-[0.1em] uppercase">
            Application Form
          </h1>
          <div className="flex items-center justify-center gap-4 mt-4 mb-2">
            <div className="h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]/80 w-16" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            <div className="h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]/80 w-16" />
          </div>
          <p className="font-sans text-[10px] sm:text-xs text-[#BDBDBD]/50 tracking-widest uppercase mt-4">
            Curated exclusively for visionary founders and leaders
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Guest application form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* ── The Name ──────────────────────────────────────────────── */}
            <Field
              id="field-name"
              label="The Name"
              required
              error={fieldErrors.name}
              hint="How may we introduce you at the table?"
            >
              <div data-has-error={fieldErrors.name || undefined}>
                <input
                  id="field-name" type="text" name="name"
                  value={form.name} onChange={onText} onKeyDown={onAlphaKey}
                  autoComplete="name" maxLength={200}
                  aria-required="true" aria-invalid={!!fieldErrors.name}
                  aria-describedby="field-name-hint"
                  placeholder="How may we introduce you at the table?"
                  className={inputBase(fieldErrors.name)}
                />
              </div>
            </Field>

            {/* ── Email Address ─────────────────────────────────────────── */}
            <Field
              id="field-email"
              label="Email Address"
              required
              error={fieldErrors.email}
              hint="Where may Viora send your invitation?"
            >
              <div data-has-error={fieldErrors.email || undefined}>
                <input
                  id="field-email" type="email" name="email"
                  value={form.email} onChange={onText}
                  autoComplete="email" maxLength={150}
                  aria-required="true" aria-invalid={!!fieldErrors.email}
                  placeholder="Where may Viora send your invitation?"
                  className={inputBase(fieldErrors.email)}
                />
              </div>
            </Field>

            {/* ── The Number ───────────────────────────────────────────── */}
            <Field
              id="field-phone"
              label="The Number"
              error={fieldErrors.contactNumber}
              hint="Where may Viora reach you personally?"
            >
              <div className="flex gap-2" data-has-error={fieldErrors.contactNumber || undefined}>
                <CountrySelect id="phone-cc" value={form.phoneCountryCode} onChange={v => set("phoneCountryCode", v)} />
                <input
                  id="field-phone" type="tel" name="contactNumber"
                  value={form.contactNumber} onChange={onText} onKeyDown={onDigitKey}
                  inputMode="numeric" maxLength={15}
                  aria-invalid={!!fieldErrors.contactNumber}
                  aria-describedby="field-phone-hint"
                  placeholder="Where may Viora reach you personally?"
                  className={inputBase(fieldErrors.contactNumber) + " flex-1"}
                />
              </div>
            </Field>

            {/* ── WhatsApp Number ──────────────────────────────────────── */}
            <Field
              id="field-whatsapp"
              label="WhatsApp Number"
              error={fieldErrors.whatsapp}
              hint="Where may we reach you beyond the usual?"
            >
              <div className="flex gap-2" data-has-error={fieldErrors.whatsapp || undefined}>
                <CountrySelect id="wa-cc" value={form.whatsappCountryCode} onChange={v => set("whatsappCountryCode", v)} />
                <input
                  id="field-whatsapp" type="tel" name="whatsapp"
                  value={form.whatsapp} onChange={onText} onKeyDown={onDigitKey}
                  inputMode="numeric" maxLength={15}
                  aria-invalid={!!fieldErrors.whatsapp}
                  aria-describedby="field-whatsapp-hint"
                  placeholder="Where may we reach you beyond the usual?"
                  className={inputBase(fieldErrors.whatsapp) + " flex-1"}
                />
              </div>
            </Field>

            {/* ── The Company ──────────────────────────────────────────── */}
            <div className="sm:col-span-2">
              <Field
                id="field-company"
                label="The Company Name"
                error={fieldErrors.company}
                hint="What organisation, venture or pursuit currently carries your name?"
              >
                <input
                  id="field-company" type="text" name="company"
                  value={form.company} onChange={onText}
                  maxLength={150}
                  aria-describedby="field-company-hint"
                  placeholder="What organisation, venture or pursuit currently carries your name?"
                  className={inputBase(fieldErrors.company)}
                />
              </Field>
            </div>

            {/* ── Annual Turnover ──────────────────────────────────────── */}
            <div className="sm:col-span-2">
              <Field
                id="field-turnover"
                label="Annual Turnover"
                error={fieldErrors.annualTurnover}
              >
                <div className="relative">
                  <select
                    id="field-turnover" name="annualTurnover"
                    value={form.annualTurnover}
                    onChange={e => set("annualTurnover", e.target.value)}
                    className={`appearance-none w-full bg-[#0A0A0A]/60 border ${fieldErrors.annualTurnover ? "border-red-500/50" : "border-[#D4AF37]/15"} focus:border-[#D4AF37] py-3 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all cursor-pointer ${form.annualTurnover ? "text-[#F5F5F5]" : "text-[#BDBDBD]/30"}`}
                  >
                    <option value="" disabled>Select range (₹ INR)</option>
                    {ANNUAL_TURNOVER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-[#1A1515] text-[#F5F5F5]">{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/40 pointer-events-none" />
                </div>
              </Field>
            </div>

          </div>{/* /grid */}



          {/* ── The Journey ──────────────────────────────────────────────── */}
          <Field
            id="field-journey"
            label="The Journey"
            error={fieldErrors.journey}
            hint="Tell us a little about your journey."
            counter={{ current: form.journey.length, max: 2000 }}
          >
            <textarea
              id="field-journey" name="journey"
              value={form.journey} onChange={onText}
              rows={4} maxLength={2000}
              aria-describedby="field-journey-hint"
              placeholder="Tell us a little about your journey."
              className={textareaBase(fieldErrors.journey)}
            />
          </Field>

          {/* ── The Digital Door ─────────────────────────────────────────── */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-4 bg-[#D4AF37]/50" />
              <span className="font-serif text-[10px] tracking-[0.35em] text-[#D4AF37]/60 uppercase whitespace-nowrap">
                The Digital Door
              </span>
              <div className="h-[1px] flex-1 bg-[#D4AF37]/10" />
            </div>
            <p className="ml-8 text-[9px] text-[#BDBDBD]/35 font-sans italic -mt-1">
              Where may we discover more of your world?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* LinkedIn — mandatory */}
              <Field
                id="field-linkedin"
                label="LinkedIn"
                required
                error={fieldErrors.linkedinUrl}
              >
                <div data-has-error={fieldErrors.linkedinUrl || undefined}>
                  <input
                    id="field-linkedin" type="url" name="linkedinUrl"
                    value={form.linkedinUrl} onChange={onText}
                    maxLength={500}
                    aria-required="true" aria-invalid={!!fieldErrors.linkedinUrl}
                    placeholder="LinkedIn Profile URL"
                    className={inputBase(fieldErrors.linkedinUrl)}
                  />
                </div>
              </Field>

              {/* Instagram — optional */}
              <Field
                id="field-instagram"
                label="Instagram"
                error={fieldErrors.instagramUrl}
              >
                <input
                  id="field-instagram" type="url" name="instagramUrl"
                  value={form.instagramUrl} onChange={onText}
                  maxLength={500}
                  placeholder="Instagram Profile URL"
                  className={inputBase(fieldErrors.instagramUrl)}
                />
              </Field>

              {/* Facebook — optional */}
              <Field
                id="field-facebook"
                label="Facebook"
                error={fieldErrors.facebookUrl}
              >
                <input
                  id="field-facebook" type="url" name="facebookUrl"
                  value={form.facebookUrl} onChange={onText}
                  maxLength={500}
                  placeholder="Facebook Profile URL"
                  className={inputBase(fieldErrors.facebookUrl)}
                />
              </Field>

              {/* Website — optional */}
              <Field
                id="field-website"
                label="Website"
                error={fieldErrors.websiteUrl}
              >
                <input
                  id="field-website" type="url" name="websiteUrl"
                  value={form.websiteUrl} onChange={onText}
                  maxLength={500}
                  placeholder="Website URL"
                  className={inputBase(fieldErrors.websiteUrl)}
                />
              </Field>

            </div>
          </div>

          {/* ── The Table ─────────────────────────────────────────────────── */}
          <Field
            id="field-table"
            label="The Table"
            error={fieldErrors.whatValue}
            hint="What makes your presence worth having around Viora's table?"
            counter={{ current: form.whatValue.length, max: 2000 }}
          >
            <textarea
              id="field-table" name="whatValue"
              value={form.whatValue} onChange={onText}
              rows={4} maxLength={2000}
              aria-describedby="field-table-hint"
              placeholder="What makes your presence worth having around Viora's table?"
              className={textareaBase(fieldErrors.whatValue)}
            />
          </Field>

          {/* ── The Tribe ─────────────────────────────────────────────────── */}
          <Field
            id="field-tribe"
            label="The Tribe"
            error={fieldErrors.tribe}
            hint="Who in your world could add something meaningful to this table?"
            counter={{ current: form.tribe.length, max: 1000 }}
          >
            {/* Secondary description rendered between hint and input */}
            <p className="text-[10px] sm:text-[11px] text-[#BDBDBD]/40 font-sans italic leading-snug -mt-0.5 mb-1">
              Name a person, founder, organisation or company whose presence could enrich the conversation.
            </p>
            <textarea
              id="field-tribe" name="tribe"
              value={form.tribe} onChange={onText}
              rows={3} maxLength={1000}
              aria-describedby="field-tribe-hint"
              placeholder="Name a person, founder, organisation or company whose presence could enrich the conversation."
              className={textareaBase(fieldErrors.tribe)}
            />
          </Field>

          {/* ── The Note ─────────────────────────────────────────────────── */}
          <Field
            id="field-notes"
            label="The Note"
            error={fieldErrors.notes}
            hint="Anything Viora should know?"
            counter={{ current: form.notes.length, max: 1000 }}
          >
            <textarea
              id="field-notes" name="notes"
              value={form.notes} onChange={onText}
              rows={3} maxLength={1000}
              aria-describedby="field-notes-hint"
              placeholder="Anything Viora should know?"
              className={textareaBase(fieldErrors.notes)}
            />
          </Field>

          {/* ── Confirmation ─────────────────────────────────────────────── */}
          <div className={`flex items-start gap-4 pt-1 rounded-lg ${fieldErrors.confirmed ? 'ring-1 ring-red-500/40 p-3 bg-red-900/5' : ''}`} data-has-error={fieldErrors.confirmed ? true : undefined}>
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="field-confirmed" type="checkbox" name="confirmed"
                checked={form.confirmed}
                onChange={e => set("confirmed", e.target.checked)}
                className="w-4 h-4 rounded border-[#D4AF37]/30 bg-[#0A0A0A] focus:ring-[#D4AF37] focus:ring-offset-0 focus:ring-1 cursor-pointer appearance-none checked:bg-[#D4AF37] relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-[5px] after:h-[10px] after:border-r-[2px] after:border-b-[2px] after:border-[#0A0A0A] after:rotate-45"
              />
            </div>
            <label htmlFor="field-confirmed" className="font-sans text-xs text-[#BDBDBD]/70 leading-tight pt-[1px] cursor-pointer">
              I confirm that the information provided is accurate and agree to maintaining the discretion expected within the community.
              {fieldErrors.confirmed && (
                <span className="block mt-2 text-red-400" role="alert">{fieldErrors.confirmed}</span>
              )}
            </label>
          </div>

          {/* ── Global error ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {globalError && (
              <motionFramer.div
                key="global-err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-400/80 text-xs font-sans p-3 bg-red-900/10 border border-red-900/20 rounded-lg"
                role="alert" aria-live="assertive"
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                {globalError}
              </motionFramer.div>
            )}
          </AnimatePresence>

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <div className="pt-4">
            <button
              id="submit-application"
              type="submit"
              disabled={isSubmitting || submitted || eventAvailability !== 'active' || !form.confirmed}
              className="group relative w-full px-8 py-4 bg-[#D4AF37]/10 overflow-hidden rounded-lg transition-all duration-500 border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-[#D4AF37]/40 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 bg-[#D4AF37]/5 group-hover:bg-[#D4AF37]/10 transition-colors duration-500" />
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motionFramer.span key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex items-center gap-2 font-sans text-xs sm:text-sm tracking-[0.2em] text-[#D4AF37] uppercase font-semibold">
                    <Check size={14} /> Submitted
                  </motionFramer.span>
                ) : eventAvailability === 'loading' ? (
                  <motionFramer.span key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="relative z-10 flex items-center gap-2 font-sans text-xs sm:text-sm tracking-[0.2em] text-[#D4AF37] uppercase font-semibold">
                    Checking availability…
                  </motionFramer.span>
                ) : eventAvailability === 'ended' ? (
                  <motionFramer.span key="ended" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="relative z-10 flex items-center gap-2 font-sans text-xs sm:text-sm tracking-[0.2em] text-red-400 uppercase font-semibold">
                    Applications Ended
                  </motionFramer.span>
                ) : isSubmitting ? (
                  <motionFramer.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="relative z-10 flex items-center gap-2 font-sans text-xs sm:text-sm tracking-[0.2em] text-[#D4AF37] uppercase font-semibold">
                    <span className="w-3.5 h-3.5 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </motionFramer.span>
                ) : (
                  <motionFramer.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="relative z-10 flex items-center gap-2 font-sans text-xs sm:text-sm tracking-[0.2em] text-[#D4AF37] group-hover:text-[#F6D365] uppercase font-semibold transition-colors duration-300">
                    Request an Invitation
                    <Send size={14} className="text-[#D4AF37] group-hover:text-[#F6D365] transition-colors duration-300" />
                  </motionFramer.span>
                )}
              </AnimatePresence>
            </button>
          </div>

        </form>
      </motionFramer.div>
    </div>
  );
};
