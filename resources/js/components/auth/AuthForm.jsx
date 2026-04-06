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
            const data = await api(mode === "login" ? "/auth/login" : "/auth/register", {
                method: "POST",
                body: form,
            });

            onAuthSuccess(data.token, data.user);
        } catch (error) {
            onError(error.message);
        }
    };

    return (
        <section
            className={[
                ui.card,
                "mx-auto w-full overflow-hidden p-0",
                mode === "login" ? "max-w-md" : "max-w-2xl",
            ].join(" ")}
        >
            <div className="border-b border-[#dfe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-5 py-5 md:px-6">
                <div className="mb-4 inline-flex rounded-full border border-[#d7e3fb] bg-white p-1">
                    <button
                        className={[
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            mode === "login" ? "bg-[#355da8] text-white" : "text-[#355da8] hover:bg-[#eef3ff]",
                        ].join(" ")}
                        onClick={() => setMode("login")}
                        type="button"
                    >
                        {t("auth.loginTitle")}
                    </button>
                    <button
                        className={[
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            mode === "register" ? "bg-[#355da8] text-white" : "text-[#355da8] hover:bg-[#eef3ff]",
                        ].join(" ")}
                        onClick={() => setMode("register")}
                        type="button"
                    >
                        {t("auth.registerAction")}
                    </button>
                </div>

                <h2 className="text-xl font-bold text-slate-900">{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("auth.subtitle")}</p>
            </div>

            <form onSubmit={submit} className="grid gap-4 px-5 py-5 md:px-6 md:py-6">
                <div className={mode === "register" ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
                    {mode === "register" && (
                        <input
                            className={ui.input}
                            placeholder={t("auth.fullName")}
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                        />
                    )}

                    <input
                        className={ui.input}
                        data-testid="login-email"
                        placeholder={t("auth.email")}
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />

                    <input
                        className={ui.input}
                        data-testid="login-password"
                        type="password"
                        placeholder={t("auth.password")}
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />

                    {mode === "register" && (
                        <>
                            <input
                                className={ui.input}
                                placeholder={t("auth.phone")}
                                value={form.phone}
                                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                            />
                            <input
                                className={ui.input}
                                placeholder={t("auth.region")}
                                value={form.region}
                                onChange={(event) => setForm({ ...form, region: event.target.value })}
                            />
                            <input
                                className={ui.input}
                                placeholder={t("auth.city")}
                                value={form.city}
                                onChange={(event) => setForm({ ...form, city: event.target.value })}
                            />
                            <input
                                className={ui.input}
                                placeholder={t("auth.school")}
                                value={form.school}
                                onChange={(event) => setForm({ ...form, school: event.target.value })}
                            />
                            <select
                                className={ui.input}
                                value={form.test_language}
                                onChange={(event) => setForm({ ...form, test_language: event.target.value })}
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
                                onChange={(event) => setForm({ ...form, profile_subjects: event.target.value })}
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
                                onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })}
                            />
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-2 border-t border-[#e7eefc] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button className={ui.primaryButton} data-testid="auth-submit" type="submit">
                        {mode === "login" ? t("auth.loginAction") : t("auth.registerAction")}
                    </button>

                    <button className={ui.linkButton} type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                        {mode === "login" ? t("auth.switchToRegister") : t("auth.switchToLogin")}
                    </button>
                </div>
            </form>
        </section>
    );
}
