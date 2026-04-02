import React, { useState } from "react";
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from "../../constants/registration";
import { ui } from "../../constants/ui";
import { useLocale } from "../../context/LocaleContext";
import { api } from "../../lib/api";

export function AuthForm({ onAuthSuccess, onError }) {
    const { t } = useLocale();
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        region: "",
        city: "",
        school: "",
        test_language: "kaz",
        profile_subjects: PROFILE_SUBJECTS[0].value,
        password: "",
        password_confirmation: "",
    });

    const submit = async (event) => {
        event.preventDefault();
        onError("");

        try {
            const data = await api(
                mode === "login" ? "/auth/login" : "/auth/register",
                {
                    method: "POST",
                    body: form,
                }
            );

            onAuthSuccess(data.token, data.user);
        } catch (error) {
            onError(error.message);
        }
    };

    return (
        <section
            className={[
                ui.card,
                "mx-auto w-full",
                mode === "login" ? "max-w-md" : "max-w-xl",
            ].join(" ")}
        >
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                    {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
                </h2>
                <p className="text-sm text-slate-600">
                    {t("auth.subtitle")}
                </p>
            </div>

            <form onSubmit={submit} className="grid gap-3">
                {mode === "register" && (
                    <input
                        className={ui.input}
                        placeholder={t("auth.fullName")}
                        value={form.name}
                        onChange={(event) =>
                            setForm({ ...form, name: event.target.value })
                        }
                    />
                )}

                <input
                    className={ui.input}
                    data-testid="login-email"
                    placeholder={t("auth.email")}
                    value={form.email}
                    onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                    }
                />
                <input
                    className={ui.input}
                    type="password"
                    data-testid="login-password"
                    placeholder={t("auth.password")}
                    value={form.password}
                    onChange={(event) =>
                        setForm({ ...form, password: event.target.value })
                    }
                />

                {mode === "register" && (
                    <>
                        <input
                            className={ui.input}
                            placeholder={t("auth.phone")}
                            value={form.phone}
                            onChange={(event) =>
                                setForm({ ...form, phone: event.target.value })
                            }
                        />
                        <input
                            className={ui.input}
                            placeholder={t("auth.region")}
                            value={form.region}
                            onChange={(event) =>
                                setForm({ ...form, region: event.target.value })
                            }
                        />
                        <input
                            className={ui.input}
                            placeholder={t("auth.city")}
                            value={form.city}
                            onChange={(event) =>
                                setForm({ ...form, city: event.target.value })
                            }
                        />
                        <input
                            className={ui.input}
                            placeholder={t("auth.school")}
                            value={form.school}
                            onChange={(event) =>
                                setForm({ ...form, school: event.target.value })
                            }
                        />
                        <select
                            className={ui.input}
                            value={form.test_language}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    test_language: event.target.value,
                                })
                            }
                        >
                            {TEST_LANGUAGES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {t("auth.testLanguage")}: {t(item.labelKey)}
                                </option>
                            ))}
                        </select>
                        <select
                            className={ui.input}
                            value={form.profile_subjects}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    profile_subjects: event.target.value,
                                })
                            }
                        >
                            {PROFILE_SUBJECTS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {t("auth.profileSubjects")}: {t(item.labelKey)}
                                </option>
                            ))}
                        </select>
                        <input
                            className={ui.input}
                            type="password"
                            placeholder={t("auth.confirmPassword")}
                            value={form.password_confirmation}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    password_confirmation: event.target.value,
                                })
                            }
                        />
                    </>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button className={ui.primaryButton} data-testid="auth-submit" type="submit">
                        {mode === "login" ? t("auth.loginAction") : t("auth.registerAction")}
                    </button>
                    <button
                        className={ui.linkButton}
                        type="button"
                        onClick={() =>
                            setMode(mode === "login" ? "register" : "login")
                        }
                    >
                        {mode === "login"
                            ? t("auth.switchToRegister")
                            : t("auth.switchToLogin")}
                    </button>
                </div>
            </form>
        </section>
    );
}
