"use client";
import { operatingCopy, type OperatingCopyKey } from "@/features/i18n/operating-copy";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type {
  PilotConfiguration,
  PilotInvitation,
  PilotUser,
} from "./administration-module";
import { allowedRoles as roles } from "./administration-module";
import type { AuditEvent } from "@/features/reports/moderation-module";
import { OperatingControls } from "./operating-controls";
import { defaultPilotOperations, type PilotOperations } from "./pilot-operations";
import { measurementCopy } from "@/features/pilot/measurement-copy";

export type AdministrationSnapshot = {
  users: PilotUser[];
  configuration: PilotConfiguration;
  invitations: PilotInvitation[];
  audit: AuditEvent[];
  operations?: PilotOperations;
};

export function AdministrationWorkspace({
  initial,
}: {
  initial: AdministrationSnapshot;
}) {
  const { locale, chooseLocale } = useLocale();
  const t = (key: OperatingCopyKey) => operatingCopy(locale, key);
  const [snapshot, setSnapshot] = useState(initial);
  const [configuration, setConfiguration] = useState(initial.configuration);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const administrators = snapshot.users.filter(
    (user) => user.roles.includes("Administrator") && user.emailVerified,
  ).length;
  async function mutate(action: string, input: unknown) {
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/administration", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, input }),
      });
      if (!response.ok) {
        const result = await response.json();
        const detail =
          locale === "en"
            ? result.error
            : result.code === "FORBIDDEN"
              ? "Wala kang pahintulot. Mag-sign in muli."
              : result.code === "CONFLICT"
                ? t("conflict")
              : result.code === "INVITATIONS_PAUSED"
                ? t("invitationsPaused")
              : result.code === "VALIDATION"
                ? "Suriin ang mga detalye. Kailangan ang dahilan, tamang mga tungkulin, aktibong destinasyon, at HTTPS na emergency source."
                : "Hindi makumpleto ang pagbabago. Subukang muli.";
        throw new Error(detail);
      }
      const updated = await fetch("/api/administration", { cache: "no-store" });
      if (!updated.ok)
        throw new Error(
          t("changeSavedButAccessOrRefreshFailedReturn"),
        );
      const next = (await updated.json()) as AdministrationSnapshot;
      setSnapshot(next);
      if (action === "update-configuration")
        setConfiguration(next.configuration);
      setNotice(t("changesSaved"));
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? t("connectionLostRefreshToCheckWhetherTheChange")
          : failure instanceof Error
            ? failure.message
            : t("pleaseRetry"),
      );
    } finally {
      setPending(false);
    }
  }
  function submit(
    event: FormEvent<HTMLFormElement>,
    action: string,
    fields: (data: FormData) => unknown,
  ) {
    event.preventDefault();
    const trigger = event.currentTarget.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    );
    void mutate(action, fields(new FormData(event.currentTarget))).then(() =>
      trigger?.focus({ preventScroll: true }),
    );
  }
  async function refreshControls() {
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/administration", { cache: "no-store" });
      if (!response.ok) throw new Error(t("accessOrRefreshFailedSignInAndRetry"));
      setSnapshot(await response.json());
    } catch {
      setError(t("refreshCouldNotBeConfirmedKeepYourEdits"));
    } finally { setPending(false); }
  }
  return (
    <main className="admin-page">
      <header className="composer-header">
        <Link className="brand" href="/">
          Ayos Southville
        </Link>
        <div className="admin-header-actions">
          <Link href="/account">{t("myAccount")}</Link>
          <button
            className="language-button"
            onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}
          >
            {locale === "en" ? "Filipino" : "English"}
          </button>
        </div>
      </header>
      <div className="admin-shell">
        <h1>{t("pilotAdministration")}</h1>
        <p className="admin-intro">
          {t("inviteNeighborsProtectAccessAndKeepReportRouting")}
        </p>
        <nav
          className="admin-section-nav"
          aria-label={t("administrationSections")}
        >
          <a href="#people">{t("people")}</a>
          <a href="#coverage">{t("coverage")}</a>
          <a href="#invitations">{t("invitationsLabel")}</a>
          <a href="#configuration">{t("configuration")}</a>
          <a href="#audit">{t("auditHistory")}</a>
          <Link href="/administration/operations">{t("privacyOperations")}</Link>
          <Link href="/administration/measurement">{measurementCopy[locale].title}</Link>
        </nav>
        <div className="admin-continuity" role="status">
          {administrators >= 2
            ? t("twoAdministratorAccountsAreVerifiedBackupCoverageStill")
            : t("beforeLaunchAddASecondVerifiedAdministrator")}{" "}
          {administrators}{" "}
          {t("verifiedAdministrators")}.
        </div>
        <p className="admin-feedback" role="status" aria-live="polite">
          {pending
            ? t("saving")
            : notice
              ? t("changesSaved")
              : ""}
        </p>
        {error && (
          <div className="admin-error" role="alert">
            {error}{" "}
            <button type="button" className="button button-quiet" disabled={pending} onClick={() => void refreshControls()}>{t("refreshOperatingControls")}</button>{" "}
            <Link href="/account">
              {t("returnToAccount")}
            </Link>
          </div>
        )}
        <OperatingControls key={snapshot.operations?.revision ?? 0} confirmed={snapshot.operations ?? defaultPilotOperations} users={snapshot.users} pending={pending} locale={locale} save={input => mutate("update-operations", input)} />
        <section id="people" className="admin-section">
          <h2>{t("peopleAndAccess")}</h2>
          <p>
            {t("approvalAllowsReportingRolesGrantOperationalCapabilitiesRevoking")}
          </p>
          {snapshot.users.length === 0 ? (
            <p>
              {t("residentsAppearHereAfterCreatingAnAccount")}
            </p>
          ) : (
            snapshot.users.map((user) => (
              <article className="admin-person" key={user.uid}>
                <h3>{user.publicAlias || user.email || user.uid}</h3>
                <p className="admin-private-detail">
                  {user.email || user.uid} ·{" "}
                  {user.emailVerified
                    ? t("verifiedEmail")
                    : t("emailNotVerified")}{" "}
                  ·{" "}
                  {user.access === "revoked"
                    ? t("accessRevoked")
                    : user.access === "approved"
                      ? t("approved")
                      : t("invitationOrOperatorAccess")}
                </p>
                <div className="admin-person-forms">
                  <form
                    onSubmit={(event) =>
                      submit(event, "set-access", (data) => ({
                        uid: user.uid,
                        access: data.get("access"),
                        reason: data.get("reason"),
                      }))
                    }
                  >
                    <fieldset disabled={pending}>
                      <legend>{t("pilotAccess")}</legend>
                      <label>
                        {t("accessDecision")}
                        <select
                          name="access"
                          defaultValue={user.access ?? "approved"}
                        >
                          <option value="approved">
                            {t("approve")}
                          </option>
                          <option value="revoked">
                            {t("revoke")}
                          </option>
                        </select>
                      </label>
                      <label>
                        {t("accessReason")}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-dark" type="submit">
                        {t("saveAccess")}
                      </button>
                    </fieldset>
                  </form>
                  <form
                    onSubmit={(event) =>
                      submit(event, "set-roles", (data) => ({
                        uid: user.uid,
                        roles: data.getAll("roles"),
                        reason: data.get("reason"),
                      }))
                    }
                  >
                    <fieldset disabled={pending}>
                      <legend>{t("capabilities")}</legend>
                      <div className="admin-role-options">
                        {roles.map((role) => (
                          <label key={role}>
                            <input
                              type="checkbox"
                              name="roles"
                              value={role}
                              defaultChecked={user.roles.includes(role)}
                            />
                            {role === "Resident"
                              ? t("resident")
                              : role === "Moderator"
                                ? t("moderator")
                                : role === "Coordinator"
                                  ? t("coordinator")
                                  : t("administrator")}
                          </label>
                        ))}
                      </div>
                      <label>
                        {t("roleChangeReason")}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-dark" type="submit">
                        {t("saveRoles")}
                      </button>
                    </fieldset>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>
        <section id="invitations" className="admin-section">
          <h2>{t("inviteAResident")}</h2>
          <p>
            {t("addTheEmailTheyWillVerifyDuringRegistration")}
          </p>
          <form
            onSubmit={(event) =>
              submit(event, "set-invitation", (data) => ({
                email: data.get("email"),
                active: true,
                reason: data.get("reason"),
              }))
            }
          >
            <fieldset className="admin-invite-form" disabled={pending || snapshot.operations?.invitationsPaused}>
              <legend className="sr-only">
                {t("invitationDetails")}
              </legend>
              <label>
                {t("emailAddress")}
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="off"
                />
              </label>
              <label>
                {t("invitationReason")}
                <input name="reason" required maxLength={500} />
              </label>
              <button className="button button-primary" type="submit">
                {t("inviteResident")}
              </button>
            </fieldset>
          </form>
          {snapshot.invitations.length === 0 ? (
            <p>
              {t("noInvitationsYetAddYourFirstPilotParticipant")}
            </p>
          ) : (
            <ul className="admin-invitations">
              {snapshot.invitations.map((invitation) => (
                <li key={invitation.email}>
                  <span>
                    {invitation.email} ·{" "}
                    {invitation.active
                      ? t("active")
                      : t("revoked")}
                  </span>
                  <form
                    onSubmit={(event) =>
                      submit(event, "set-invitation", (data) => ({
                        email: invitation.email,
                        active: !invitation.active,
                        reason: data.get("reason"),
                      }))
                    }
                  >
                    <fieldset disabled={pending}>
                      <label>
                        {t("changeReason")}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-quiet" type="submit">
                        {invitation.active
                          ? t("revokeInvitation")
                          : t("restoreInvitation")}
                      </button>
                    </fieldset>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section id="configuration" className="admin-section">
          <h2>{t("reportingConfiguration")}</h2>
          <p>
            {t("keepIdentifiersStableDeactivateEntriesInsteadOfRenaming")}
          </p>
          <form
            onSubmit={(event) =>
              submit(event, "update-configuration", (data) => ({
                configuration,
                reason: data.get("reason"),
              }))
            }
          >
            <fieldset disabled={pending}>
              <legend className="sr-only">
                {t("configuration")}
              </legend>
              <h3>{t("responsibleDestinations")}</h3>
              {configuration.destinations.map((destination, index) => (
                <div className="admin-config-row" key={index}>
                  <label>
                    {t("identifier")}
                    <input
                      required
                      value={destination.id}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          destinations: current.destinations.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, id: event.target.value }
                                : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label>
                    {t("destinationName")}
                    <input
                      required
                      value={destination.name}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          destinations: current.destinations.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, name: event.target.value }
                                : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={destination.active}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          destinations: current.destinations.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, active: event.target.checked }
                                : entry,
                          ),
                        }))
                      }
                    />
                    {t("active")}
                  </label>
                </div>
              ))}
              <button
                className="button button-quiet"
                type="button"
                onClick={() =>
                  setConfiguration((current) => ({
                    ...current,
                    destinations: [
                      ...current.destinations,
                      { id: "", name: "", active: false },
                    ],
                  }))
                }
              >
                {t("addDestination")}
              </button>
              <h3>{t("reportCategories")}</h3>
              {configuration.categories.map((category, index) => (
                <div
                  className="admin-config-row admin-category-row"
                  key={index}
                >
                  <label>
                    {t("categoryIdentifier")}
                    <input
                      required
                      value={category.id}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          categories: current.categories.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, id: event.target.value }
                                : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  {(["en", "fil"] as const).map((language) => (
                    <label key={language}>
                      {language === "en"
                        ? t("englishLabel")
                        : t("filipinoLabel")}
                      <input
                        required
                        value={category.label[language]}
                        onChange={(event) =>
                          setConfiguration((current) => ({
                            ...current,
                            categories: current.categories.map(
                              (entry, position) =>
                                position === index
                                  ? {
                                      ...entry,
                                      label: {
                                        ...entry.label,
                                        [language]: event.target.value,
                                      },
                                    }
                                  : entry,
                            ),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <label>
                    {t("destination")}
                    <select
                      value={category.destinationId}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          categories: current.categories.map(
                            (entry, position) =>
                              position === index
                                ? {
                                    ...entry,
                                    destinationId: event.target.value,
                                  }
                                : entry,
                          ),
                        }))
                      }
                    >
                      {configuration.destinations.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.name || destination.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={category.active}
                      onChange={(event) =>
                        setConfiguration((current) => ({
                          ...current,
                          categories: current.categories.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, active: event.target.checked }
                                : entry,
                          ),
                        }))
                      }
                    />
                    {t("active")}
                  </label>
                </div>
              ))}
              <button
                className="button button-quiet"
                type="button"
                onClick={() =>
                  setConfiguration((current) => ({
                    ...current,
                    categories: [
                      ...current.categories,
                      {
                        id: "",
                        label: { en: "", fil: "" },
                        destinationId: current.destinations[0]?.id ?? "",
                        active: false,
                      },
                    ],
                  }))
                }
              >
                {t("addCategory")}
              </button>
              <h3>
                {t("verifiedEmergencyGuidance")}
              </h3>
              <div className="admin-emergency-grid">
                {(["en", "fil"] as const).map((language) => (
                  <section key={language}>
                    <h4>{language === "en" ? "English" : "Filipino"}</h4>
                    {(["message", "phone", "sourceUrl"] as const).map(
                      (field) => (
                        <label key={field}>
                          {field === "message"
                            ? t("emergencyMessage")
                            : field === "phone"
                              ? t("emergencyPhone")
                              : t("verifiedHttpsSource")}
                          <input
                            required
                            type={field === "sourceUrl" ? "url" : "text"}
                            value={configuration.emergency[language][field]}
                            onChange={(event) =>
                              setConfiguration((current) => ({
                                ...current,
                                emergency: {
                                  ...current.emergency,
                                  [language]: {
                                    ...current.emergency[language],
                                    [field]: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                  </section>
                ))}
              </div>
              <label>
                {t("configurationChangeReason")}
                <input required name="reason" maxLength={500} />
              </label>
              <button className="button button-primary" type="submit">
                {t("saveConfiguration")}
              </button>
            </fieldset>
          </form>
        </section>
        <section id="audit" className="admin-section">
          <h2>{t("auditHistory")}</h2>
          <p>
            {t("latestPrivilegedActionsPrivateToAdministrators")}
          </p>
          {snapshot.audit.length === 0 ? (
            <p>
              {t("savedAdministrativeChangesWillAppearHere")}
            </p>
          ) : (
            <ol className="admin-audit">
              {snapshot.audit.map((event, index) => (
                <li key={index}>
                  <strong>{event.action}</strong>
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString(
                      locale === "fil" ? "fil-PH" : "en-PH",
                      { timeZone: "Asia/Manila" },
                    )}
                  </time>
                  <p>{event.reason}</p>
                  <small>
                    {t("actor")}: {event.actorUid} ·{" "}
                    {t("target")}: {event.target}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
