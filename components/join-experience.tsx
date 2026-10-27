"use client";

import { useEffect, useRef, useState } from "react";
import { getCapabilityRefinement } from "@/lib/adaptive";
import { isContactPreferenceValid } from "@/lib/profile";
import { firstMissingRequiredStep, firstUnresolvedIntakeStep, intakeSteps, isContactMethodRequired, nextIntakeStep, shouldLoadCanonicalProfile, type IntakeStep } from "@/lib/intake-flow";
import { capabilitySuggestions, interestSuggestions, seededProjects } from "@/lib/seed";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";
import { SiteHeader } from "@/components/site-header";
import { Select, type SelectOption } from "@/components/ui/select";
import type { PublicSocialProvider } from "@/lib/auth-providers";
import type { Ask, AskType, AskUrgency, ContactMethod, ContactPreference, Interest, Profile, ProfileDraft, ProfileStatus, Project, Skill } from "@/lib/types";

type Step = IntakeStep | "claim" | "publish" | "published";
const steps = intakeSteps;
const emptyDraft = (): ProfileDraft => ({ type: "PERSON", displayName: "", identity: "", capabilities: [], interests: [], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "", capabilitiesText: "", interestsText: "", asks: [], timezone: "", contacts: [], contactPreference: null, links: [], exclusions: [], claimed: false, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [] });
const timezoneOptions: SelectOption[] = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney", "UTC"].map((value) => ({ value, label: value }));
const askTypeOptions: SelectOption[] = ["Collaborators", "Feedback", "Developer", "Designer", "Funding", "Distribution", "Introduction", "Something else"].map((value) => ({ value, label: value }));
const contactMethodOptions: SelectOption[] = ["Telegram", "X", "Farcaster", "Higherio", "Email", "Website"].map((value) => ({ value, label: value }));
const linkLabelOptions: SelectOption[] = ["Higherio", "Farcaster", "X", "GitHub", "Personal website"].map((value) => ({ value, label: value }));

export function JoinExperience({ enabledProviders = [] }: { enabledProviders?: PublicSocialProvider[] }) {
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [step, setStep] = useState<Step>("welcome");
  const [ready, setReady] = useState(false);
  const [publishedProfile, setPublishedProfile] = useState<Profile | null>(null);
  const [ownedProfileId, setOwnedProfileId] = useState<string | null>(null);
  const [ownerAction, setOwnerAction] = useState<"hide" | "restore" | "delete" | "restart" | null>(null);
  const [ownerError, setOwnerError] = useState("");
  const loadedCanonical = useRef(false);
  const session = authClient.useSession();
  useEffect(() => { const existing = loadDraft(); if (existing) { setDraft(existing); setStep(existing.published ? "published" : firstUnresolvedIntakeStep(existing)); } setReady(true); }, []);
  useEffect(() => { if (ready) saveDraft(draft); }, [draft, ready]);
  useEffect(() => { if (ready && draft.claimed && session.data?.user && draft.status === "DRAFT" && !draft.published) setStep("publish"); }, [draft.claimed, draft.published, draft.status, ready, session.data?.user]);
  useEffect(() => { const hasInProgressAnonymousDraft = !draft.published && draft.status === "DRAFT" && hasStartedAnonymousDraft(draft); if (loadedCanonical.current || !shouldLoadCanonicalProfile({ ready, authenticated: Boolean(session.data?.user), hasInProgressAnonymousDraft, draftClaimed: draft.claimed })) return; loadedCanonical.current = true; fetch("/api/profiles/me").then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.profile) { setOwnedProfileId(payload.profile.id); setDraft((current) => ({ ...current, ...payload.profile, published: payload.profile.status === "PUBLISHED" })); setStep("published"); } }).catch(() => undefined); }, [draft, ready, session.data?.user]);
  const reloadCanonical = async () => {
    const response = await fetch("/api/profiles/me", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.profile) throw new Error(payload?.error || "Could not reload the profile.");
    setOwnedProfileId(payload.profile.id);
    setPublishedProfile(null);
    setDraft((current) => ({ ...current, ...payload.profile, published: payload.profile.status === "PUBLISHED" }));
    setStep("published");
  };
  const runOwnerAction = async (action: "hide" | "restore" | "delete") => {
    if (!ownedProfileId || ownerAction) return;
    if (action === "delete" && !window.confirm("Delete this profile? It will be retained as a private tombstone.")) return;
    setOwnerAction(action);
    setOwnerError("");
    try {
      const response = await fetch(`/api/profiles/${action}`, { method: action === "delete" ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action === "delete" ? { profileId: ownedProfileId, confirm: true } : { profileId: ownedProfileId, ...(action === "hide" ? { status: "HIDDEN" } : {}) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Profile could not be ${action}d.`);
      if (action === "delete") {
        clearDraft();
        setDraft(emptyDraft());
        setOwnedProfileId(null);
        setPublishedProfile(null);
        setStep("welcome");
      } else {
        await reloadCanonical();
      }
    } catch (error) {
      setOwnerError(error instanceof Error ? error.message : `Profile could not be ${action}d.`);
    } finally {
      setOwnerAction(null);
    }
  };
  const restartProfile = async () => {
    if (ownerAction) return;
    setOwnerAction("restart");
    setOwnerError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Could not sign out before starting another profile.");
      clearDraft();
      setDraft(emptyDraft());
      setOwnedProfileId(null);
      setPublishedProfile(null);
      setStep("welcome");
    } catch (error) {
      setOwnerError(error instanceof Error ? error.message : "Could not sign out before starting another profile.");
    } finally {
      setOwnerAction(null);
    }
  };
  const update = (patch: Partial<ProfileDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const next = (requested?: Step) => {
    const destination = requested || (step === "capabilities" && getCapabilityRefinement(draft.capabilities) ? "refine" : nextIntakeStep(step as IntakeStep));
    if (destination === "preview") {
      const missing = firstMissingRequiredStep(draft);
      if (missing) { setStep(missing); return; }
    }
    if (["interests", "projects", "asks", "contact", "links", "exclusions"].includes(step)) {
      const optionalStep = step as "interests" | "projects" | "asks" | "contact" | "links" | "exclusions";
      update({ skippedOptionalSteps: hasStepContent(step, draft)
        ? draft.skippedOptionalSteps.filter((item) => item !== optionalStep)
        : Array.from(new Set([...draft.skippedOptionalSteps, optionalStep])) });
    }
    setStep(destination);
  };
  const back = () => setStep(step === "welcome" ? "welcome" : previousStep(step));
  if (!ready) return null;
  if (step === "welcome") return <Shell><div className="max-w-3xl pt-20 sm:pt-32"><Eyebrow>ASK HIGHER / JOIN</Eyebrow><h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">Make yourself easier to find in Higher.</h1><p className="mt-8 max-w-lg text-lg leading-8 text-[var(--muted)]">Tell people what you work on, what you can help with, and where you’re looking for a connection.</p><button className="primary mt-12" onClick={() => next("name")}>Start your profile <Arrow /></button></div></Shell>;
  if (step === "preview" || step === "published") return <Shell published={step === "published"}><ProfilePreview draft={publishedProfile || draft} published={step === "published"} owned={Boolean(ownedProfileId && session.data?.user)} profileStatus={draft.status} canPublish={Boolean(session.data?.user && draft.claimed)} ownerAction={ownerAction} ownerError={ownerError} onEdit={(target) => { if (step === "published") setPublishedProfile(null); next(target); }} onClaim={() => { if (session.data?.user && draft.claimed) { next("publish"); return; } const claimedDraft = { ...draft, claimed: true }; setDraft(claimedDraft); saveDraft(claimedDraft); next("claim"); }} onHide={() => runOwnerAction("hide")} onRestore={() => runOwnerAction("restore")} onDelete={() => runOwnerAction("delete")} onRestart={restartProfile} /></Shell>;
  if (step === "claim") return <SocialClaimStep onBack={back} enabledProviders={enabledProviders} />;
  if (step === "publish") return <PublishStep draft={draft} onPublished={(profile) => { update({ published: true }); setOwnedProfileId(profile.id); setPublishedProfile(profile); setStep("published"); }} onReview={() => next("preview")} />;
  return <Shell><div className="progress-row"><button className="back-button" onClick={back} aria-label="Go back">←</button><div className="progress"><span style={{ width: `${Math.min(100, (steps.indexOf(step) + 1) / steps.length * 100)}%` }} /></div><span className="progress-count">{Math.max(1, steps.indexOf(step) + 1)} / {steps.length}</span></div><div key={step} className="question-wrap fade-in">{renderStep(step, draft, update, next)}</div></Shell>;
}

function renderStep(step: Step, draft: ProfileDraft, update: (patch: Partial<ProfileDraft>) => void, next: (step?: Step) => void) {
  if (step === "name") return <Question eyebrow="FIRST, A LITTLE ABOUT YOU" title="I’m…"><input autoFocus className="big-input" value={draft.displayName} onChange={(e) => update({ displayName: e.target.value })} onKeyDown={(e) => e.key === "Enter" && draft.displayName.trim() && next()} placeholder="Your name" /><Continue disabled={!draft.displayName.trim()} onClick={() => next()} /></Question>;
  if (step === "identity") return <Question eyebrow="IN A FEW WORDS" title="I work on…"><textarea autoFocus className="big-input min-h-32 resize-none" value={draft.identity} onChange={(e) => update({ identity: e.target.value })} placeholder="Product design and creative technology" /><Continue disabled={!draft.identity.trim()} onClick={() => next()} /></Question>;
  if (step === "capabilities") return <TagQuestion title="I can help with…" hint="Write it your way, then keep the suggestions that fit." values={draft.capabilities} suggestions={capabilitySuggestions} rawText={draft.capabilitiesText} onRawTextChange={(capabilitiesText) => update({ capabilitiesText })} onChange={(values) => update({ capabilities: values as Skill[] })} next={next} />;
  if (step === "refine") { const branch = getCapabilityRefinement(draft.capabilities); if (!branch) return null; return <Question eyebrow="A LITTLE MORE SIGNAL" title={branch.title} copy={branch.copy}><div className="choice-grid">{branch.options.map((label) => <Choice key={label} active={draft.capabilities.some((item) => item.label === label)} onClick={() => update({ capabilities: toggleTag(draft.capabilities, label, "suggested"), capabilityRefined: true })}>{label}</Choice>)}</div><Continue onClick={() => next("interests")} label="That’s enough" /></Question>; }
  if (step === "interests") return <TagQuestion title="I’m interested in…" hint="Interest isn’t a claim of expertise. Follow your curiosity." values={draft.interests} suggestions={interestSuggestions} rawText={draft.interestsText} onRawTextChange={(interestsText) => update({ interestsText })} onChange={(values) => update({ interests: values as Interest[] })} next={next} interest />;
  if (step === "projects") return <ProjectStep draft={draft} update={update} next={next} />;
  if (step === "asks") return <AskStep draft={draft} update={update} next={next} />;
  if (step === "timezone") return <Question eyebrow="KEEP IT SIMPLE" title="My timezone is…" copy="Only your timezone — never your precise location."><Select value={draft.timezone} onValueChange={(timezone) => update({ timezone })} options={timezoneOptions} placeholder="Select a timezone" ariaLabel="Timezone" /><Continue disabled={!draft.timezone} onClick={() => next()} /></Question>;
  if (step === "contact") return <ContactStep draft={draft} update={update} next={next} />;
  if (step === "preference") { const options: Array<{ value: ContactPreference; label: string }> = [{ value: "DIRECT_CONTACT", label: "Direct contact" }, { value: "INTRO_REQUESTS", label: "Intro requests" }, { value: "BOTH", label: "Both" }, { value: "NOT_AVAILABLE", label: "Not available right now" }]; const invalid = draft.contactPreference !== null && !isContactPreferenceValid(draft); return <Question eyebrow="THE DOOR" title="I’m open to…"><div className="choice-grid">{options.map((option) => <Choice key={option.value} active={draft.contactPreference === option.value} onClick={() => update({ contactPreference: option.value })}>{option.label}</Choice>)}</div>{invalid && <p className="validation-message">Add at least one contact method for direct contact.</p>}<Continue disabled={!draft.contactPreference || invalid} onClick={() => next()} /></Question>; }
  if (step === "links") return <LinksStep draft={draft} update={update} next={next} />;
  return <Question eyebrow="OPTIONAL" title="Don’t match me for…" copy="A little context can prevent an unhelpful introduction."><textarea className="big-input min-h-32 resize-none" value={draft.exclusions[0]?.text || ""} onChange={(e) => update({ exclusions: e.target.value ? [{ id: "exclusion-1", text: e.target.value }] : [] })} placeholder="NFT consulting work" /><Continue onClick={() => next("preview")} label="See my profile" /></Question>;
}

function Shell({ children, published = false }: { children: React.ReactNode; published?: boolean }) { return <main className="min-h-screen px-5 pb-16 sm:px-10"><SiteHeader variant={published ? "published" : "intake"} />{children}</main>; }
function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="text-xs font-bold tracking-[0.18em] text-[var(--muted)]">{children}</p>; }
function Question({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy?: string; children: React.ReactNode }) { return <><Eyebrow>{eyebrow}</Eyebrow><h1 className="question-title">{title}</h1>{copy && <p className="question-copy">{copy}</p>}{children}</>; }
function Continue({ onClick, disabled, label = "Continue" }: { onClick: () => void; disabled?: boolean; label?: string }) { return <button className="primary mt-10" disabled={disabled} onClick={onClick}>{label} <Arrow /></button>; }
function Arrow() { return <span aria-hidden>↗</span>; }
function Choice({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) { return <button className={`choice ${active ? "choice-active" : ""}`} onClick={onClick}>{children}<span>{active ? "✓" : "+"}</span></button>; }
function TagQuestion({ title, hint, values, suggestions, rawText, onRawTextChange, onChange, next, interest }: { title: string; hint: string; values: (Skill | Interest)[]; suggestions: string[]; rawText: string; onRawTextChange: (value: string) => void; onChange: (values: (Skill | Interest)[]) => void; next: (step?: Step) => void; interest?: boolean }) { const add = (label: string, source: "suggested" | "custom" = "suggested") => { if (!values.some((item) => item.label.toLowerCase() === label.toLowerCase())) { const originalText = rawText.trim() || (source === "custom" ? label : undefined); onChange([...values, { id: `${interest ? "interest" : "skill"}-${label.toLowerCase().replaceAll(" ", "-")}`, label, source, ...(originalText ? { originalText } : {}) }]); } onRawTextChange(""); }; const refinement = getCapabilityRefinement(values as Skill[]); return <Question eyebrow="A SIGNAL, NOT A TEST" title={title} copy={hint}><div className="tag-input-wrap"><input autoFocus className="tag-input" value={rawText} onChange={(e) => onRawTextChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rawText.trim() && add(rawText, "custom")} placeholder="Start typing…" /><button className="add-button" onClick={() => rawText.trim() && add(rawText, "custom")}>Add</button></div><div className="tag-list">{values.map((item) => <button aria-label={`Remove ${item.label}`} className="tag tag-selected" key={item.id} onClick={() => onChange(values.filter((value) => value.id !== item.id))}>{item.label} ×</button>)}</div><p className="suggestion-label">Suggestions</p><div className="tag-list">{suggestions.filter((item) => !values.some((value) => value.label === item)).map((item) => <button aria-pressed={values.some((value) => value.label === item)} className="tag" key={item} onClick={() => add(item)}>{item} +</button>)}</div><Continue disabled={!interest && !values.length} onClick={() => next(interest ? undefined : refinement ? "refine" : "interests")} /></Question>; }
function ProjectStep({ draft, update, next }: { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void; next: () => void }) {
  const [custom, setCustom] = useState("");
  const toggle = (project: Project) => {
    const selected = draft.selectedProjects.some((item) => item.id === project.id);
    update({ selectedProjects: selected ? draft.selectedProjects.filter((item) => item.id !== project.id) : [...draft.selectedProjects, project], projects: selected ? draft.projects.filter((item) => item.projectId !== project.id) : [...draft.projects, { profileId: "draft", projectId: project.id }] });
  };
  const setRole = (projectId: string, role: string, roleSource: "suggested" | "custom") => update({ projects: draft.projects.map((relationship) => relationship.projectId === projectId ? { ...relationship, role: role || undefined, roleSource: role ? roleSource : undefined, originalRoleText: roleSource === "custom" && role ? role : undefined } : relationship) });
  const add = () => {
    if (!custom.trim()) return;
    const project = { id: `project-${Date.now()}`, name: custom.trim(), description: "Created during profile intake.", type: "PROJECT" as const };
    update({ selectedProjects: [...draft.selectedProjects, project], createdProjects: [...draft.createdProjects, project], projectDetails: [...draft.projectDetails, project], projects: [...draft.projects, { profileId: "draft", projectId: project.id }], customProjectDraft: "" });
    setCustom("");
  };
  return <Question eyebrow="MAKE IT CONCRETE" title="Right now I’m building…" copy="Attach the projects you’re part of. Create one if it isn’t here yet."><div className="project-list">{seededProjects.map((project) => <Choice key={project.id} active={draft.selectedProjects.some((item) => item.id === project.id)} onClick={() => toggle(project)}><span className="text-left"><b className="block">{project.name}</b><small>{project.description}</small></span></Choice>)}</div><div className="inline-add"><input className="text-input" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Create a new project" /><button className="outline-button" onClick={add}>Create</button></div>{draft.selectedProjects.length > 0 && <div className="project-role-list"><p className="suggestion-label">Optional roles</p>{draft.selectedProjects.map((project) => { const relationship = draft.projects.find((item) => item.projectId === project.id); return <div className="project-role" key={project.id}><span>{project.name}</span><div className="role-suggestions">{["Founder", "Co-founder", "Contributor", "Builder"].map((role) => <button key={role} className={`mini-choice ${relationship?.role === role ? "mini-active" : ""}`} onClick={() => setRole(project.id, role, "suggested")}>{role}</button>)}<input className="text-input" value={relationship?.roleSource === "custom" ? relationship.role || "" : ""} onChange={(e) => setRole(project.id, e.target.value, "custom")} placeholder="Or write a role" /></div></div>; })}</div>}<Continue onClick={next} label={draft.selectedProjects.length ? "Continue" : "Skip for now"} /></Question>;
}
function AskStep({ draft, update, next }: { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void; next: () => void }) { const [type, setType] = useState<AskType>("Collaborators"); const [detail, setDetail] = useState(""); const [urgency, setUrgency] = useState<AskUrgency>("Exploring"); const add = () => { if (!detail.trim()) return; const ask: Ask = { id: `ask-${Date.now()}`, type, detail: detail.trim(), urgency }; update({ asks: [...draft.asks, ask] }); setDetail(""); }; return <Question eyebrow="MAKE THE ASK CLEAR" title="Right now I’m looking for…" copy="Add as many small asks as you like. You can always add more later."><div className="ask-form"><Select value={type} onValueChange={(value) => setType(value as AskType)} options={askTypeOptions} ariaLabel="Ask type" /><input className="text-input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="A detail that helps someone say yes" /><div className="urgency-row">{(["Exploring", "Actively looking", "Needed now"] as AskUrgency[]).map((item) => <button key={item} className={`mini-choice ${urgency === item ? "mini-active" : ""}`} onClick={() => setUrgency(item)}>{item}</button>)}</div><button className="outline-button" onClick={add}>Add this ask +</button></div><div className="ask-list">{draft.asks.map((ask) => <div className="ask-item" key={ask.id}><span><b>{ask.type}</b><br />{ask.detail}</span><small>{ask.urgency}</small><button onClick={() => update({ asks: draft.asks.filter((item) => item.id !== ask.id) })} aria-label={`Remove ${ask.type}`}>×</button></div>)}</div><Continue onClick={next} label={draft.asks.length ? "Continue" : "Skip for now"} /></Question>; }
function ContactStep({ draft, update, next }: { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void; next: () => void }) { const [method, setMethod] = useState<ContactMethod>("Telegram"); const [value, setValue] = useState(""); const required = isContactMethodRequired(draft.contactPreference); const add = () => { const trimmed = value.trim(); if (!trimmed) return; update({ contacts: [...draft.contacts.filter((item) => item.method !== method), { method, value: trimmed }] }); setValue(""); }; return <Question eyebrow="MAKE A PATH" title="Reach me on…" copy="Add one or more methods, then continue when you’re ready."><div className="ask-form"><Select value={method} onValueChange={(value) => setMethod(value as ContactMethod)} options={contactMethodOptions} ariaLabel="Contact method" /><div className="inline-add"><input className="text-input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="@handle or link" /><button className="outline-button" disabled={!value.trim()} onClick={add}>Add contact method</button></div></div><div className="ask-list">{draft.contacts.map((contact) => <div className="ask-item" key={contact.method}><span><b>{contact.method}</b><br />{contact.value}</span><button onClick={() => update({ contacts: draft.contacts.filter((item) => item.method !== contact.method) })}>×</button></div>)}</div><Continue disabled={required && !draft.contacts.length} onClick={next} label={draft.contacts.length ? "Continue" : required ? "Add a contact method" : "Skip for now"} /></Question>; }
function LinksStep({ draft, update, next }: { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void; next: () => void }) { const [label, setLabel] = useState("Higherio"); const [url, setUrl] = useState(""); const add = () => { if (!url.trim()) return; update({ links: [...draft.links, { label, url: url.trim() }] }); setUrl(""); }; return <Question eyebrow="OPTIONAL / LESS PROMINENT" title="I’m also at…"><div className="ask-form"><div className="inline-add"><Select value={label} onValueChange={setLabel} options={linkLabelOptions} ariaLabel="Link type" /><input className="text-input" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="https://…" /></div><button className="outline-button" onClick={add}>Add link</button></div><div className="tag-list">{draft.links.map((link) => <button className="tag tag-selected" key={link.url} onClick={() => update({ links: draft.links.filter((item) => item.url !== link.url) })}>{link.label} ×</button>)}</div><Continue onClick={next} label={draft.links.length ? "Continue" : "Skip for now"} /></Question>; }
function SocialClaimStep({ onBack, enabledProviders }: { onBack: () => void; enabledProviders: PublicSocialProvider[] }) {
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<PublicSocialProvider | "email" | null>(null);
  const [error, setError] = useState("");
  const signIn = async (provider: PublicSocialProvider) => {
    setBusy(provider);
    setError("");
    const result = await authClient.signIn.social({ provider, callbackURL: "/join" });
    if (result.error) {
      setError(result.error.message || "Could not start sign-in.");
      setBusy(null);
    }
  };
  const claim = async () => {
    if (!email.trim()) return;
    setBusy("email");
    setError("");
    const result = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: "/join" });
    if (result.error) {
      setError(result.error.message || "Could not send the magic link.");
      setBusy(null);
    } else {
      setSent(true);
      setBusy(null);
    }
  };
  return <Shell><div className="question-wrap">
    <Eyebrow>YOUR PROFILE IS READY</Eyebrow>
    <h1 className="question-title">Claim this profile.</h1>
    <p className="question-copy">Sign in to claim this profile. Your draft will still be here when you return.</p>
    {!emailMode && !sent && <div className="auth-provider-list" aria-label="Sign-in options">
      {enabledProviders.includes("google") && <button className="outline-button auth-provider" disabled={Boolean(busy)} onClick={() => signIn("google")}>
        {busy === "google" ? "Opening Google…" : "Continue with Google"} <Arrow />
      </button>}
      {enabledProviders.includes("github") && <button className="outline-button auth-provider" disabled={Boolean(busy)} onClick={() => signIn("github")}>
        {busy === "github" ? "Opening GitHub…" : "Continue with GitHub"} <Arrow />
      </button>}
      {enabledProviders.includes("twitter") && <button className="outline-button auth-provider" disabled={Boolean(busy)} onClick={() => signIn("twitter")}>
        {busy === "twitter" ? "Opening X…" : "Continue with X"} <Arrow />
      </button>}
      <button className="text-button auth-secondary" onClick={() => setEmailMode(true)}>Continue with email</button>
    </div>}
    {sent ? <>
      <p className="question-copy">Check your email for a secure link. Your draft will still be here when you return.</p>
    </> : emailMode && <>
      <input autoFocus className="big-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && claim()} placeholder="you@example.com" />
      <button className="primary mt-10" disabled={!email.trim() || Boolean(busy)} onClick={claim}>{busy === "email" ? "Sending…" : "Send claim link"} <Arrow /></button>
      <button className="text-button mt-5" onClick={() => setEmailMode(false)}>Use a social provider instead</button>
    </>}
    {error && <p className="validation-message" role="alert">{error}</p>}
    <button className="text-button mt-5" onClick={onBack}>Back</button>
  </div></Shell>;
}

function PublishStep({ draft, onPublished, onReview }: { draft: ProfileDraft; onPublished: (profile: Profile) => void; onReview: () => void }) { const [consent, setConsent] = useState(false); const [publishing, setPublishing] = useState(false); const [error, setError] = useState(""); const publish = async () => { setPublishing(true); setError(""); try { const response = await fetch("/api/profiles/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, directoryConsent: consent }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.errors?.join(" ") || payload.error || "Profile could not be published."); onPublished(payload as Profile); } catch (caught) { setError(caught instanceof Error ? caught.message : "Profile could not be published."); setPublishing(false); } }; return <Shell><div className="question-wrap"><Eyebrow>ONE LAST THING</Eyebrow><h1 className="question-title">Make it discoverable.</h1><p className="question-copy">By publishing, you agree that the information in this profile can be searched and used by Ask Higher to recommend you to other Higher participants.</p><label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>I’m happy for this profile to be searchable.</span></label>{error && <p className="validation-message" role="alert">{error}</p>}<button className="primary mt-10" disabled={!consent || publishing} onClick={publish}>{publishing ? "Publishing…" : "Publish profile"} {!publishing && <Arrow />}</button><button className="text-button mt-5" onClick={onReview}>Review again</button></div></Shell>; }
function ProfilePreview({ draft, published, owned, profileStatus, canPublish, ownerAction, ownerError, onEdit, onClaim, onHide, onRestore, onDelete, onRestart }: { draft: ProfileDraft | Profile; published: boolean; owned: boolean; profileStatus: ProfileStatus; canPublish: boolean; ownerAction: "hide" | "restore" | "delete" | "restart" | null; ownerError: string; onEdit: (step: Step) => void; onClaim: () => void; onHide: () => void; onRestore: () => void; onDelete: () => void; onRestart: () => Promise<void> }) { const profile = draft; const selectedProjects = "selectedProjects" in draft ? draft.selectedProjects : draft.projectDetails; const projectRelationships = profile.projects; const projectItems = selectedProjects.map((project) => { const relationship = projectRelationships.find((item) => item.projectId === project.id); return relationship?.role ? `${project.name} · ${relationship.role}` : project.name; }); return <div className="preview-wrap fade-in"><div className="preview-top"><Eyebrow>{published ? "PUBLISHED PROFILE" : "PROFILE PREVIEW"}</Eyebrow>{published && <span className="live-dot">● {profileStatus === "HIDDEN" ? "HIDDEN" : "LIVE"}</span>}</div><h1 className="preview-name">{profile.displayName || "Your name"}</h1><p className="preview-identity">{sentenceCase(profile.identity || "Your work in a sentence")}</p><div className="preview-grid"><PreviewSection published={published} title="Can help with" items={profile.capabilities.map((item) => item.label)} edit={() => onEdit("capabilities")} /><PreviewSection published={published} title="Building" items={projectItems} edit={() => onEdit("projects")} /><PreviewSection published={published} title="Looking for" items={profile.asks.map((item) => `${item.type}: ${item.detail} · ${item.urgency}`)} edit={() => onEdit("asks")} /><PreviewSection published={published} title="Interested in" items={profile.interests.map((item) => item.label)} edit={() => onEdit("interests")} /><PreviewSection published={published} title="Contact method" items={profile.contacts.map((item) => `${item.method}: ${item.value}`)} edit={() => onEdit("contact")} /><PreviewSection published={published} title="Open to" items={profile.contactPreference ? [contactPreferenceLabel(profile.contactPreference)] : []} edit={() => onEdit("preference")} /></div>{published && owned ? <div className="owner-tools"><Eyebrow>OWNER CONTROLS</Eyebrow>{ownerError && <p className="validation-message" role="alert">{ownerError}</p>}<div className="owner-actions"><button className="outline-button" disabled={Boolean(ownerAction)} onClick={() => onEdit("name")}>Edit profile</button>{profileStatus === "HIDDEN" ? <button className="text-button" disabled={Boolean(ownerAction)} onClick={onRestore}>{ownerAction === "restore" ? "Restoring…" : "Restore profile"}</button> : <button className="text-button" disabled={Boolean(ownerAction)} onClick={onHide}>{ownerAction === "hide" ? "Hiding…" : "Hide profile"}</button>}<button className="text-button" disabled={Boolean(ownerAction)} onClick={onDelete}>{ownerAction === "delete" ? "Deleting…" : "Delete profile"}</button><button className="text-button" disabled={Boolean(ownerAction)} onClick={onRestart}>{ownerAction === "restart" ? "Signing out…" : "Start another profile"}</button></div></div> : <div className="preview-actions"><button className="primary" onClick={onClaim}>{canPublish ? "Save changes" : "Claim this profile"} <Arrow /></button><button className="text-button" onClick={() => onEdit("name")}>Edit answers</button></div>}</div>; }
function PreviewSection({ title, items, edit, published }: { title: string; items: string[]; edit: () => void; published: boolean }) { if (published && !items.length) return null; return <section className="preview-section"><div className="section-heading"><Eyebrow>{title}</Eyebrow>{!published && <button onClick={edit}>Edit</button>}</div>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-preview">Not added yet</p>}</section>; }
function contactPreferenceLabel(preference: ContactPreference): string { return ({ DIRECT_CONTACT: "Direct contact", INTRO_REQUESTS: "Intro requests", BOTH: "Direct contact + intro requests", NOT_AVAILABLE: "Not available right now" })[preference]; }
function sentenceCase(value: string): string { const text = value.trim(); return text ? `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}` : text; }
function toggleTag<T extends Skill | Interest>(values: T[], label: string, source: "suggested" | "custom"): T[] { const found = values.find((item) => item.label === label); return found ? values.filter((item) => item.label !== label) : [...values, { id: `${label.toLowerCase().replaceAll(" ", "-")}`, label, source } as T]; }
function previousStep(current: Step): Step { if (current === "refine") return "capabilities"; if (current === "preview") return "exclusions"; if (!intakeSteps.includes(current as IntakeStep)) return "preview"; const index = steps.indexOf(current as IntakeStep); return index > 0 ? steps[index - 1] : "welcome"; }
function hasStartedAnonymousDraft(draft: ProfileDraft): boolean { return Boolean(draft.displayName.trim() || draft.identity.trim() || draft.capabilities.length || draft.interests.length || draft.selectedProjects.length || draft.asks.length || draft.timezone || draft.contacts.length || draft.contactPreference); }
function hasStepContent(step: string, draft: ProfileDraft): boolean { if (step === "projects") return draft.selectedProjects.length > 0; if (step === "asks") return draft.asks.length > 0; if (step === "contact") return draft.contacts.length > 0; if (step === "links") return draft.links.length > 0; if (step === "exclusions") return draft.exclusions.length > 0; return true; }
