"use client";

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

export type AdministrationSnapshot = {
  users: PilotUser[];
  configuration: PilotConfiguration;
  invitations: PilotInvitation[];
  audit: AuditEvent[];
};

export function AdministrationWorkspace({
  initial,
}: {
  initial: AdministrationSnapshot;
}) {
  const { locale, chooseLocale } = useLocale();
  const t = (en: string, fil: string) => (locale === "fil" ? fil : en);
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
              : result.code === "VALIDATION"
                ? "Suriin ang mga detalye. Kailangan ang dahilan, tamang mga tungkulin, aktibong destinasyon, at HTTPS na emergency source."
                : "Hindi makumpleto ang pagbabago. Subukang muli.";
        throw new Error(detail);
      }
      const updated = await fetch("/api/administration", { cache: "no-store" });
      if (!updated.ok)
        throw new Error(
          t(
            "Change saved, but access or refresh failed. Return to your account and refresh before retrying.",
            "Nai-save ang pagbabago, ngunit hindi ma-refresh. Bumalik sa iyong account bago subukang muli.",
          ),
        );
      const next = (await updated.json()) as AdministrationSnapshot;
      setSnapshot(next);
      if (action === "update-configuration")
        setConfiguration(next.configuration);
      setNotice(t("Changes saved.", "Nai-save ang mga pagbabago."));
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? t(
              "Connection lost. Refresh to check whether the change saved before retrying.",
              "Nawala ang koneksyon. I-refresh muna upang tingnan kung nai-save bago subukang muli.",
            )
          : failure instanceof Error
            ? failure.message
            : t("Please retry.", "Subukang muli."),
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
  return (
    <main className="admin-page">
      <header className="composer-header">
        <Link className="brand" href="/">
          Ayos Southville
        </Link>
        <div className="admin-header-actions">
          <Link href="/account">{t("My account", "Aking account")}</Link>
          <button
            className="language-button"
            onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}
          >
            {locale === "en" ? "Filipino" : "English"}
          </button>
        </div>
      </header>
      <div className="admin-shell">
        <h1>{t("Pilot administration", "Pamamahala ng pilot")}</h1>
        <p className="admin-intro">
          {t(
            "Invite neighbors, protect access, and keep report routing clear. This is an independent resident-led pilot; destinations are internal pilot desks.",
            "Mag-imbita ng kapitbahay, pamahalaan ang access, at linawin ang ruta ng mga ulat. Independent na pilot ito ng mga residente; internal na pilot desk ang mga destinasyon.",
          )}
        </p>
        <nav
          className="admin-section-nav"
          aria-label={t("Administration sections", "Mga seksyon ng pamamahala")}
        >
          <a href="#people">{t("People", "Mga tao")}</a>
          <a href="#invitations">{t("Invitations", "Mga imbitasyon")}</a>
          <a href="#configuration">{t("Configuration", "Mga setting")}</a>
          <a href="#audit">{t("Audit history", "Kasaysayan ng audit")}</a>
        </nav>
        <div className="admin-continuity" role="status">
          {administrators >= 2
            ? t(
                "Administrator continuity is ready.",
                "Handa ang pagpapatuloy ng pamamahala.",
              )
            : t(
                "Before launch, add a second verified administrator.",
                "Bago ilunsad, magdagdag ng pangalawang verified administrator.",
              )}{" "}
          {administrators}{" "}
          {t("verified administrators", "verified na administrator")}.
        </div>
        <p className="admin-feedback" role="status" aria-live="polite">
          {pending
            ? t("Saving…", "Sine-save…")
            : notice
              ? t("Changes saved.", "Nai-save ang mga pagbabago.")
              : ""}
        </p>
        {error && (
          <div className="admin-error" role="alert">
            {error}{" "}
            <Link href="/account">
              {t("Return to account", "Bumalik sa account")}
            </Link>
          </div>
        )}
        <section id="people" className="admin-section">
          <h2>{t("People and access", "Mga tao at access")}</h2>
          <p>
            {t(
              "Approval allows reporting. Roles grant operational capabilities. Revoking pilot access stops resident submissions even for an invited email.",
              "Ang approval ay nagpapahintulot ng pag-uulat. Ang tungkulin ay nagbibigay ng kakayahan sa pamamahala. Ang pagbawi ng access ay humihinto sa pagsumite kahit may imbitasyon.",
            )}
          </p>
          {snapshot.users.length === 0 ? (
            <p>
              {t(
                "Residents appear here after creating an account.",
                "Lalabas dito ang mga residente matapos gumawa ng account.",
              )}
            </p>
          ) : (
            snapshot.users.map((user) => (
              <article className="admin-person" key={user.uid}>
                <h3>{user.publicAlias || user.email || user.uid}</h3>
                <p className="admin-private-detail">
                  {user.email || user.uid} ·{" "}
                  {user.emailVerified
                    ? t("Verified email", "Verified na email")
                    : t(
                        "Email not verified",
                        "Hindi pa verified ang email",
                      )}{" "}
                  ·{" "}
                  {user.access === "revoked"
                    ? t("Access revoked", "Binawi ang access")
                    : user.access === "approved"
                      ? t("Approved", "Aprubado")
                      : t(
                          "Invitation or operator access",
                          "Access ayon sa imbitasyon o tungkulin",
                        )}
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
                      <legend>{t("Pilot access", "Access sa pilot")}</legend>
                      <label>
                        {t("Access decision", "Desisyon sa access")}
                        <select
                          name="access"
                          defaultValue={user.access ?? "approved"}
                        >
                          <option value="approved">
                            {t("Approve", "Aprubahan")}
                          </option>
                          <option value="revoked">
                            {t("Revoke", "Bawiin")}
                          </option>
                        </select>
                      </label>
                      <label>
                        {t("Access reason", "Dahilan sa access")}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-dark" type="submit">
                        {t("Save access", "I-save ang access")}
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
                      <legend>{t("Capabilities", "Mga kakayahan")}</legend>
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
                              ? t("Resident", "Residente")
                              : role === "Moderator"
                                ? t("Moderator", "Tagasuri")
                                : role === "Coordinator"
                                  ? t("Coordinator", "Tagapag-ugnay")
                                  : t("Administrator", "Tagapamahala")}
                          </label>
                        ))}
                      </div>
                      <label>
                        {t(
                          "Role change reason",
                          "Dahilan ng pagbabago sa tungkulin",
                        )}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-dark" type="submit">
                        {t("Save roles", "I-save ang mga tungkulin")}
                      </button>
                    </fieldset>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>
        <section id="invitations" className="admin-section">
          <h2>{t("Invite a resident", "Mag-imbita ng residente")}</h2>
          <p>
            {t(
              "Add the email they will verify during registration. This approves access; it does not send an invitation email. Share the registration link personally.",
              "Idagdag ang email na kanilang ibe-verify sa pagpaparehistro. Nagbibigay ito ng access; walang ipinapadalang email. Personal na ibahagi ang link sa pagpaparehistro.",
            )}
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
            <fieldset className="admin-invite-form" disabled={pending}>
              <legend className="sr-only">
                {t("Invitation details", "Mga detalye ng imbitasyon")}
              </legend>
              <label>
                {t("Email address", "Email address")}
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="off"
                />
              </label>
              <label>
                {t("Invitation reason", "Dahilan ng imbitasyon")}
                <input name="reason" required maxLength={500} />
              </label>
              <button className="button button-primary" type="submit">
                {t("Invite resident", "Imbitahan ang residente")}
              </button>
            </fieldset>
          </form>
          {snapshot.invitations.length === 0 ? (
            <p>
              {t(
                "No invitations yet. Add your first pilot participant above.",
                "Wala pang imbitasyon. Idagdag sa itaas ang unang kalahok.",
              )}
            </p>
          ) : (
            <ul className="admin-invitations">
              {snapshot.invitations.map((invitation) => (
                <li key={invitation.email}>
                  <span>
                    {invitation.email} ·{" "}
                    {invitation.active
                      ? t("Active", "Aktibo")
                      : t("Revoked", "Binawi")}
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
                        {t("Change reason", "Dahilan ng pagbabago")}
                        <input name="reason" required maxLength={500} />
                      </label>
                      <button className="button button-quiet" type="submit">
                        {invitation.active
                          ? t("Revoke invitation", "Bawiin ang imbitasyon")
                          : t("Restore invitation", "Ibalik ang imbitasyon")}
                      </button>
                    </fieldset>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section id="configuration" className="admin-section">
          <h2>{t("Reporting configuration", "Mga setting ng pag-uulat")}</h2>
          <p>
            {t(
              "Keep identifiers stable. Deactivate entries instead of renaming identifiers used by existing reports. Changes apply after saving.",
              "Panatilihin ang mga identifier. I-deactivate ang mga entry sa halip na palitan ang identifier na ginagamit na sa mga ulat. Magkakabisa matapos i-save.",
            )}
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
                {t("Configuration", "Mga setting")}
              </legend>
              <h3>{t("Responsible destinations", "Mga destinasyon")}</h3>
              {configuration.destinations.map((destination, index) => (
                <div className="admin-config-row" key={index}>
                  <label>
                    {t("Identifier", "Identifier")}
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
                    {t("Destination name", "Pangalan ng destinasyon")}
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
                    {t("Active", "Aktibo")}
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
                {t("Add destination", "Magdagdag ng destinasyon")}
              </button>
              <h3>{t("Report categories", "Mga kategorya ng ulat")}</h3>
              {configuration.categories.map((category, index) => (
                <div
                  className="admin-config-row admin-category-row"
                  key={index}
                >
                  <label>
                    {t("Category identifier", "Identifier ng kategorya")}
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
                        ? t("English label", "Label sa English")
                        : t("Filipino label", "Label sa Filipino")}
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
                    {t("Destination", "Destinasyon")}
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
                    {t("Active", "Aktibo")}
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
                {t("Add category", "Magdagdag ng kategorya")}
              </button>
              <h3>
                {t(
                  "Verified emergency guidance",
                  "Verified na gabay sa emergency",
                )}
              </h3>
              <div className="admin-emergency-grid">
                {(["en", "fil"] as const).map((language) => (
                  <section key={language}>
                    <h4>{language === "en" ? "English" : "Filipino"}</h4>
                    {(["message", "phone", "sourceUrl"] as const).map(
                      (field) => (
                        <label key={field}>
                          {field === "message"
                            ? t("Emergency message", "Mensahe sa emergency")
                            : field === "phone"
                              ? t("Emergency phone", "Telepono sa emergency")
                              : t(
                                  "Verified HTTPS source",
                                  "Verified na HTTPS source",
                                )}
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
                {t(
                  "Configuration change reason",
                  "Dahilan ng pagbabago sa mga setting",
                )}
                <input required name="reason" maxLength={500} />
              </label>
              <button className="button button-primary" type="submit">
                {t("Save configuration", "I-save ang mga setting")}
              </button>
            </fieldset>
          </form>
        </section>
        <section id="audit" className="admin-section">
          <h2>{t("Audit history", "Kasaysayan ng audit")}</h2>
          <p>
            {t(
              "Latest 100 privileged actions. Private to administrators.",
              "Pinakabagong 100 aksyon sa pamamahala. Pribado para sa mga administrator.",
            )}
          </p>
          {snapshot.audit.length === 0 ? (
            <p>
              {t(
                "Saved administrative changes will appear here.",
                "Lalabas dito ang mga nai-save na pagbabago sa pamamahala.",
              )}
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
                    {t("Actor", "Gumawa")}: {event.actorUid} ·{" "}
                    {t("Target", "Pakay")}: {event.target}
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
