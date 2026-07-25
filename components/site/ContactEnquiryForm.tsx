"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { submitContactForm } from "@/lib/actions/submitContactForm";
import {
  getSetupState,
  isValidAustralianPhone,
  isValidEmail,
  isValidRequiredDate,
} from "@/lib/contact/sharedValidation";

type SubmissionState = "idle" | "submitting" | "success" | "error";

type ContactMethod = "email" | "phone" | "either";

type TimingOption =
  | "asap"
  | "two-weeks"
  | "one-month"
  | "one-to-three-months"
  | "more-than-three-months"
  | "fixed-date"
  | "planning"
  | "not-sure";

type FormErrors = Partial<{
  name: string;
  email: string;
  phone: string;
  services: string;
  setup: string;
  message: string;
  contactMethod: string;
  timing: string;
  requiredDate: string;
  consent: string;
  form: string;
}>;

interface ContactEnquiryFormProps {
  initialServices?: string[];
}

interface DetailsCopy {
  label: string;
  helperText?: string;
}

const SERVICE_OPTIONS = [
  { value: "new-website", label: "New website" },
  { value: "existing-website", label: "Existing website improvements" },
  { value: "hosting", label: "Domain or hosting" },
  { value: "domain-email", label: "Hosted domain email" },
  { value: "microsoft-365", label: "Microsoft 365" },
  { value: "ongoing-support", label: "Ongoing digital support" },
  { value: "photography", label: "Photography" },
  { value: "workflow", label: "Workflow or business system" },
  { value: "other", label: "Something else" },
] as const;

const SERVICE_VALUES: ReadonlySet<string> = new Set(
  SERVICE_OPTIONS.map((option) => option.value),
);

const SETUP_OPTIONS = [
  { value: "no-setup", label: "No — this is something new" },
  { value: "website", label: "Yes — website" },
  { value: "hosting", label: "Yes — domain or hosting" },
  { value: "email-m365", label: "Yes — email or Microsoft 365" },
  { value: "workflow-system", label: "Yes — workflow or business system" },
  { value: "multi", label: "Yes — more than one of these" },
  { value: "not-sure", label: "Not sure" },
] as const;

const SETUP_VALUES: ReadonlySet<string> = new Set(
  SETUP_OPTIONS.map((option) => option.value),
);

const CONTACT_METHOD_OPTIONS: ReadonlyArray<{ value: ContactMethod; label: string }> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "either", label: "Either" },
];

const TIMING_OPTIONS: ReadonlyArray<{ value: TimingOption; label: string }> = [
  { value: "asap", label: "As soon as possible" },
  { value: "two-weeks", label: "Within the next 2 weeks" },
  { value: "one-month", label: "Within the next month" },
  { value: "one-to-three-months", label: "Within 1–3 months" },
  { value: "more-than-three-months", label: "More than 3 months away" },
  { value: "fixed-date", label: "I have a fixed date" },
  { value: "planning", label: "I’m planning ahead" },
  { value: "not-sure", label: "Not sure yet" },
];

const TIMING_VALUES: ReadonlySet<string> = new Set(
  TIMING_OPTIONS.map((option) => option.value),
);

const PHONE_ERROR_MESSAGE = "Enter a valid Australian phone number.";
const EMAIL_ERROR_MESSAGE = "Enter a valid email address.";

const fieldClassName =
  "w-full rounded-xl border border-studio-border/80 bg-studio-base/35 px-4 py-3 text-sm text-studio-text placeholder:text-studio-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base disabled:cursor-not-allowed disabled:opacity-50";

const errorClassName = "border-red-500/55 focus-visible:ring-red-500/50";

const FIELD_FOCUS_TARGETS: Record<string, string> = {
  name: "contact-name",
  email: "contact-email",
  phone: "contact-phone",
  services: "contact-service-new-website",
  setup: "contact-setup",
  message: "contact-message",
  contactMethod: "contact-method-email",
  timing: "contact-timing",
  requiredDate: "contact-requiredDate",
  consent: "contact-consent",
};

function mapQueryServiceToInternal(value: string): string | null {
  const mapped: Record<string, string> = {
    photography: "photography",
    websites: "new-website",
    hosting: "hosting",
    "microsoft-365": "microsoft-365",
    support: "ongoing-support",
    "existing-website": "existing-website",
    "domain-email": "domain-email",
    workflow: "workflow",
    other: "other",
    "new-website": "new-website",
  };

  const normalized = value.trim().toLowerCase();
  return mapped[normalized] ?? null;
}

function getUniqueValidServices(values: string[]): string[] {
  const collected = new Set<string>();
  for (const value of values) {
    const mapped = mapQueryServiceToInternal(value);
    if (mapped && SERVICE_VALUES.has(mapped)) {
      collected.add(mapped);
    }
  }
  return Array.from(collected);
}


function getDetailsCopy(selectedServices: string[]): DetailsCopy {
  if (selectedServices.length > 1) {
    return {
      label: "Tell me what you’re working on",
      helperText:
        "Describe the overall project, the services you may need and what a good result would look like.",
    };
  }

  if (selectedServices.length === 0) {
    return {
      label: "Tell me what you’re working on",
      helperText:
        "Share what you need and any important context so I can recommend the next step.",
    };
  }

  const selected = selectedServices[0];

  if (selected === "photography") {
    return {
      label: "Tell me about the photography you need",
      helperText:
        "Include who or what needs to be photographed, the location, how the images will be used and any important dates.",
    };
  }

  if (selected === "new-website" || selected === "existing-website") {
    return {
      label: "Tell me about the website or project",
      helperText:
        "Describe what you need the website to do, what is not working now and any pages, features or integrations you already have in mind.",
    };
  }

  if (selected === "hosting" || selected === "domain-email") {
    return {
      label: "Tell me about the current setup or problem",
      helperText:
        "Include the domain name, current provider, what needs to change and any error messages or deadlines.",
    };
  }

  if (
    selected === "microsoft-365" ||
    selected === "workflow" ||
    selected === "ongoing-support"
  ) {
    return {
      label: "Tell me about the business setup or process",
      helperText:
        "Describe how the team works now, what is causing difficulty and what you would like to improve.",
    };
  }

  return {
    label: "Tell me what you need help with",
  };
}

export default function ContactEnquiryForm({
  initialServices = [],
}: ContactEnquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>(() =>
    getUniqueValidServices(initialServices),
  );
  const [setup, setSetup] = useState("");
  const [message, setMessage] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [timing, setTiming] = useState<TimingOption | "">("");
  const [requiredDate, setRequiredDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [submissionState, setSubmissionState] = useState<SubmissionState>(
    "idle",
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [touched, setTouched] = useState<{ email: boolean; phone: boolean }>({
    email: false,
    phone: false,
  });

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isSubmitting = submissionState === "submitting";
  const isSuccess = submissionState === "success";
  const isError = submissionState === "error";

  const setupState = useMemo(() => getSetupState(services), [services]);
  const shouldShowSetup = setupState.shouldShowSetup;
  const derivedSetup = setupState.derivedSetup;

  const shouldShowRequiredDate = timing === "fixed-date";
  const detailsCopy = useMemo(() => getDetailsCopy(services), [services]);

  const visibleErrors = Object.entries(errors).filter(([, value]) => Boolean(value));

  useEffect(() => {
    if ((isError || Object.keys(errors).length > 0) && visibleErrors.length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errors, isError, visibleErrors.length]);

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return { ...current, [field]: undefined };
    });
  }, []);

  const validateAll = useCallback((): FormErrors => {
    const nextErrors: FormErrors = {};

    if (name.trim().length < 2) {
      nextErrors.name = "Please enter your name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = EMAIL_ERROR_MESSAGE;
    }

    if (!isValidAustralianPhone(phone)) {
      nextErrors.phone = PHONE_ERROR_MESSAGE;
    }

    if (services.length < 1) {
      nextErrors.services = "Select at least one service.";
    }

    if (shouldShowSetup && !SETUP_VALUES.has(setup)) {
      nextErrors.setup = "Select your current setup.";
    }

    if (message.trim().length < 20) {
      nextErrors.message = "Please provide at least 20 characters.";
    }

    if (!["email", "phone", "either"].includes(contactMethod)) {
      nextErrors.contactMethod = "Select a preferred contact method.";
    }

    if (contactMethod === "phone" && !phone.trim()) {
      nextErrors.phone = "Please provide a phone number if phone is preferred.";
    }

    if (timing && !TIMING_VALUES.has(timing)) {
      nextErrors.timing = "Select a valid timeframe.";
    }

    if (requiredDate && !isValidRequiredDate(requiredDate)) {
      nextErrors.requiredDate = "Enter a valid date.";
    }

    if (!consent) {
      nextErrors.consent = "You must consent before submitting.";
    }

    return nextErrors;
  }, [
    contactMethod,
    consent,
    email,
    message,
    name,
    phone,
    requiredDate,
    services,
    setup,
    shouldShowSetup,
    timing,
  ]);

  const handleEmailBlur = useCallback(() => {
    setTouched((current) => ({ ...current, email: true }));
    setErrors((current) => {
      if (!email.trim()) {
        return { ...current, email: "Please enter your email address." };
      }
      if (!isValidEmail(email)) {
        return { ...current, email: EMAIL_ERROR_MESSAGE };
      }
      if (!current.email) {
        return current;
      }
      return { ...current, email: undefined };
    });
  }, [email]);

  const handlePhoneBlur = useCallback(() => {
    setTouched((current) => ({ ...current, phone: true }));
    setErrors((current) => {
      if (!phone.trim()) {
        if (contactMethod === "phone") {
          return {
            ...current,
            phone: "Please provide a phone number if phone is preferred.",
          };
        }
        if (!current.phone) {
          return current;
        }
        return { ...current, phone: undefined };
      }

      if (!isValidAustralianPhone(phone)) {
        return { ...current, phone: PHONE_ERROR_MESSAGE };
      }

      if (!current.phone) {
        return current;
      }
      return { ...current, phone: undefined };
    });
  }, [contactMethod, phone]);

  const toggleService = useCallback((value: string) => {
    setServices((current) => {
      const nextServices = current.includes(value)
        ? current.filter((service) => service !== value)
        : [...current, value];

      const nextSetupState = getSetupState(nextServices);
      if (!nextSetupState.shouldShowSetup) {
        setSetup("");
        clearError("setup");
      }

      return nextServices;
    });
    clearError("services");
  }, [clearError]);

  const focusErrorField = useCallback((field: string) => {
    const targetId = FIELD_FOCUS_TARGETS[field];
    const target = targetId ? document.getElementById(targetId) : null;

    if (target instanceof HTMLElement) {
      target.focus();
      return;
    }

    if (formRef.current) {
      formRef.current.focus();
      return;
    }

    errorSummaryRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmissionState("submitting");
      setGlobalError("");

      const clientErrors = validateAll();
      if (Object.keys(clientErrors).length > 0) {
        setErrors(clientErrors);
        setSubmissionState("error");
        setGlobalError("Please check the highlighted fields.");
        return;
      }

      const result = await submitContactForm({
        name,
        email,
        phone,
        services,
        setup: shouldShowSetup ? setup : derivedSetup,
        message,
        contactMethod,
        timing,
        requiredDate,
        consent,
        honeypot,
      });

      if (result.success) {
        setSubmissionState("success");
        setName("");
        setEmail("");
        setPhone("");
        setServices([]);
        setSetup("");
        setMessage("");
        setContactMethod("email");
        setTiming("");
        setRequiredDate("");
        setConsent(false);
        setErrors({});
      } else {
        setSubmissionState("error");

        if (result.errors) {
          const errorMap: FormErrors = {};
          for (const error of result.errors) {
            errorMap[error.field as keyof FormErrors] = error.message;
          }
          setErrors(errorMap);
        }

        setGlobalError(result.message || "The enquiry could not be sent.");
      }
    },
    [
      consent,
      contactMethod,
      email,
      honeypot,
      message,
      name,
      phone,
      requiredDate,
      services,
      shouldShowSetup,
      setup,
      derivedSetup,
      timing,
      validateAll,
    ],
  );

  if (isSuccess) {
    return (
      <section
        className="mt-10 max-w-3xl rounded-2xl border border-studio-border bg-studio-surface/70 px-5 py-6 md:px-6 md:py-7"
        role="region"
        aria-live="polite"
        aria-label="Enquiry submission success"
      >
        <h2 className="text-xl font-medium tracking-tight text-studio-text md:text-2xl">
          Enquiry sent
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-studio-dim md:text-base">
          Thanks for getting in touch. I&apos;ll review the details and come back
          to you as soon as I can.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/work"
            className="inline-flex items-center justify-center rounded-xl border border-studio-border/60 bg-studio-surface px-4 py-2.5 text-sm font-medium text-studio-muted transition hover:bg-studio-surface/80 hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
          >
            View selected work
          </a>
          <a
            href="/digital"
            className="inline-flex items-center justify-center rounded-xl border border-studio-border/60 bg-studio-surface px-4 py-2.5 text-sm font-medium text-studio-muted transition hover:bg-studio-surface/80 hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
          >
            Explore digital services
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-10 max-w-3xl rounded-2xl border border-studio-border bg-studio-surface/70 px-5 py-6 md:px-6 md:py-7"
      aria-labelledby="contact-form-heading"
    >
      <h2
        id="contact-form-heading"
        className="text-xl font-medium tracking-tight text-studio-text md:text-2xl"
      >
        Enquiry details
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-studio-dim md:text-base">
        Share a few details and I&apos;ll come back to you with the most useful next
        step.
      </p>

      {isError && (globalError || visibleErrors.length > 0) && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-xl border border-red-500/35 bg-red-500/5 px-4 py-3"
        >
          <h3 className="font-medium text-red-300">The enquiry could not be sent</h3>
          {globalError ? <p className="mt-1 text-sm text-red-200">{globalError}</p> : null}
          {visibleErrors.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-red-200">
              {visibleErrors.map(([field, message]) => (
                <li key={field}>
                  <button
                    type="button"
                    className="underline decoration-red-300/60 underline-offset-2"
                    onClick={() => {
                      focusErrorField(field);
                    }}
                  >
                    {message}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <form
        id="contact-form"
        ref={formRef}
        tabIndex={-1}
        onSubmit={handleSubmit}
        className="mt-6 space-y-6"
      >
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <section className="space-y-4 rounded-xl border border-studio-border/60 bg-studio-base/20 p-4 md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-studio-dim">
            1. Your details
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="text-sm font-medium text-studio-text"
              >
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                disabled={isSubmitting}
                className={`mt-2 ${fieldClassName} ${errors.name ? errorClassName : ""}`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "error-name" : undefined}
              />
              {errors.name ? (
                <p id="error-name" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="text-sm font-medium text-studio-text"
              >
                Email address <span className="text-red-400">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setEmail(nextValue);
                  if (errors.email || touched.email) {
                    if (!nextValue.trim()) {
                      setErrors((current) => ({
                        ...current,
                        email: "Please enter your email address.",
                      }));
                    } else if (!isValidEmail(nextValue)) {
                      setErrors((current) => ({ ...current, email: EMAIL_ERROR_MESSAGE }));
                    } else {
                      clearError("email");
                    }
                  }
                }}
                onBlur={handleEmailBlur}
                disabled={isSubmitting}
                className={`mt-2 ${fieldClassName} ${errors.email ? errorClassName : ""}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "error-email" : "email-helper"}
              />
              {errors.email ? (
                <p id="error-email" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.email}
                </p>
              ) : (
                <p id="email-helper" className="mt-1 text-xs text-studio-dim">
                  We&apos;ll use this address to respond.
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-phone"
              className="text-sm font-medium text-studio-text"
            >
              Phone number
            </label>
            <input
              id="contact-phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                const nextValue = e.target.value;
                setPhone(nextValue);
                if (errors.phone || touched.phone) {
                  if (!nextValue.trim()) {
                    if (contactMethod === "phone") {
                      setErrors((current) => ({
                        ...current,
                        phone: "Please provide a phone number if phone is preferred.",
                      }));
                    } else {
                      clearError("phone");
                    }
                  } else if (!isValidAustralianPhone(nextValue)) {
                    setErrors((current) => ({
                      ...current,
                      phone: PHONE_ERROR_MESSAGE,
                    }));
                  } else {
                    clearError("phone");
                  }
                }
              }}
              onBlur={handlePhoneBlur}
              disabled={isSubmitting}
              className={`mt-2 ${fieldClassName} ${errors.phone ? errorClassName : ""}`}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "error-phone" : "phone-helper"}
            />
            {errors.phone ? (
              <p id="error-phone" className="mt-1 text-sm text-red-400" role="alert">
                {errors.phone}
              </p>
            ) : (
              <p id="phone-helper" className="mt-1 text-xs text-studio-dim">
                Optional, but required if you prefer a phone response.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-studio-border/60 bg-studio-base/20 p-4 md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-studio-dim">
            2. What do you need?
          </h3>

          <fieldset>
            <legend id="contact-services" className="text-sm font-medium text-studio-text">
              Select one or more services <span className="text-red-400">*</span>
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICE_OPTIONS.map((option) => {
                const selected = services.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`group flex min-h-14 cursor-pointer items-center justify-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      selected
                        ? "border-white/70 bg-white/10"
                        : "border-studio-border/70 bg-studio-base/20 hover:border-white/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        id={`contact-service-${option.value}`}
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleService(option.value)}
                        disabled={isSubmitting}
                        className="h-4 w-4 rounded border border-studio-border bg-studio-base/35 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
                        aria-invalid={!!errors.services}
                        aria-describedby={errors.services ? "error-services" : undefined}
                      />
                      <span className="text-sm text-studio-text">{option.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.services ? (
              <p id="error-services" className="mt-2 text-sm text-red-400" role="alert">
                {errors.services}
              </p>
            ) : null}
          </fieldset>

          {shouldShowSetup ? (
            <div>
              <label
                htmlFor="contact-setup"
                className="text-sm font-medium text-studio-text"
              >
                Is there an existing website or digital setup?{" "}
                <span className="text-red-400">*</span>
              </label>
              <select
                id="contact-setup"
                name="setup"
                value={setup}
                onChange={(e) => {
                  setSetup(e.target.value);
                  clearError("setup");
                }}
                disabled={isSubmitting}
                className={`mt-2 ${fieldClassName} ${errors.setup ? errorClassName : ""}`}
                aria-invalid={!!errors.setup}
                aria-describedby={errors.setup ? "error-setup" : undefined}
              >
                <option value="">Select an option</option>
                {SETUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.setup ? (
                <p id="error-setup" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.setup}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-xl border border-studio-border/60 bg-studio-base/20 p-4 md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-studio-dim">
            3. Project details
          </h3>

          <div>
            <label
              htmlFor="contact-message"
              className="text-sm font-medium text-studio-text"
            >
              {detailsCopy.label} <span className="text-red-400">*</span>
            </label>
            {detailsCopy.helperText ? (
              <p className="mt-1 text-xs text-studio-dim">{detailsCopy.helperText}</p>
            ) : null}
            <textarea
              id="contact-message"
              name="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                clearError("message");
              }}
              disabled={isSubmitting}
              className={`mt-2 min-h-36 resize-y ${fieldClassName} ${errors.message ? errorClassName : ""}`}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "error-message" : undefined}
            />
            {errors.message ? (
              <p id="error-message" className="mt-1 text-sm text-red-400" role="alert">
                {errors.message}
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-studio-border/60 bg-studio-base/20 p-4 md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-studio-dim">
            4. Contact and timing
          </h3>

          <fieldset>
            <legend
              id="contact-contactMethod"
              className="text-sm font-medium text-studio-text"
            >
              Preferred contact method
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CONTACT_METHOD_OPTIONS.map((option) => {
                const selected = contactMethod === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-14 cursor-pointer items-center justify-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      selected
                        ? "border-white/70 bg-white/10 text-studio-text"
                        : "border-studio-border/70 bg-studio-base/20 text-studio-muted hover:border-white/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        id={`contact-method-${option.value}`}
                        type="radio"
                        name="contactMethod"
                        value={option.value}
                        checked={selected}
                        onChange={(e) => {
                          setContactMethod(e.target.value as ContactMethod);
                          clearError("contactMethod");
                          if (e.target.value !== "phone" && !phone.trim()) {
                            clearError("phone");
                          }
                        }}
                        disabled={isSubmitting}
                        className="h-4 w-4 rounded-full border border-studio-border bg-studio-base/35 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
                      />
                      <span className="text-sm">{option.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.contactMethod ? (
              <p
                id="error-contactMethod"
                className="mt-1 text-sm text-red-400"
                role="alert"
              >
                {errors.contactMethod}
              </p>
            ) : null}
          </fieldset>

          <div>
            <label
              htmlFor="contact-timing"
              className="text-sm font-medium text-studio-text"
            >
              When do you need this?
            </label>
            <select
              id="contact-timing"
              name="timing"
              value={timing}
              onChange={(e) => {
                const nextTiming = e.target.value as TimingOption | "";
                setTiming(nextTiming);
                clearError("timing");
                if (nextTiming !== "fixed-date") {
                  setRequiredDate("");
                  clearError("requiredDate");
                }
              }}
              disabled={isSubmitting}
              className={`mt-2 ${fieldClassName} ${errors.timing ? errorClassName : ""}`}
              aria-invalid={!!errors.timing}
              aria-describedby={errors.timing ? "error-timing" : undefined}
            >
              <option value="">Select an option (optional)</option>
              {TIMING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.timing ? (
              <p id="error-timing" className="mt-1 text-sm text-red-400" role="alert">
                {errors.timing}
              </p>
            ) : null}
          </div>

          {shouldShowRequiredDate ? (
            <div>
              <label
                htmlFor="contact-requiredDate"
                className="text-sm font-medium text-studio-text"
              >
                Required date
              </label>
              <input
                id="contact-requiredDate"
                type="date"
                name="requiredDate"
                value={requiredDate}
                onChange={(e) => {
                  setRequiredDate(e.target.value);
                  clearError("requiredDate");
                }}
                disabled={isSubmitting}
                className={`mt-2 ${fieldClassName} ${errors.requiredDate ? errorClassName : ""}`}
                aria-invalid={!!errors.requiredDate}
                aria-describedby={errors.requiredDate ? "error-requiredDate" : "requiredDate-helper"}
              />
              {errors.requiredDate ? (
                <p
                  id="error-requiredDate"
                  className="mt-1 text-sm text-red-400"
                  role="alert"
                >
                  {errors.requiredDate}
                </p>
              ) : (
                <p id="requiredDate-helper" className="mt-1 text-xs text-studio-dim">
                  Optional. Leave blank if the date is still flexible.
                </p>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-xl border border-studio-border/60 bg-studio-base/20 p-4 md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-studio-dim">
            5. Consent and submit
          </h3>

          <div className="flex items-start gap-3 rounded-xl border border-studio-border/50 bg-studio-base/20 px-3 py-3">
            <input
              id="contact-consent"
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                clearError("consent");
              }}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 cursor-pointer rounded border border-studio-border bg-studio-base/35 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "error-consent" : undefined}
            />
            <label
              htmlFor="contact-consent"
              className="cursor-pointer text-sm leading-relaxed text-studio-muted"
            >
              I consent to Blackburn Studio using these details to respond to my
              enquiry. <span className="text-red-400">*</span>
            </label>
          </div>
          {errors.consent ? (
            <p id="error-consent" className="text-sm text-red-400" role="alert">
              {errors.consent}
            </p>
          ) : null}

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-studio-border bg-white px-5 py-2.5 text-sm font-medium text-studio-base transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send enquiry"}
            </button>
          </div>
        </section>
      </form>
    </section>
  );
}
