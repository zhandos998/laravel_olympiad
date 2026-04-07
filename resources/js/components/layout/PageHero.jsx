import React from "react";
import { BrandLogoSlot } from "./BrandLogoSlot";

export function PageHero({
    eyebrow,
    title,
    description,
    aside = null,
    actions = null,
    className = "",
}) {
    return (
        <section
            className={[
                "relative overflow-hidden rounded-[2rem] border border-[#d7e3fb] bg-[linear-gradient(135deg,#ffffff_0%,#f7f9ff_48%,#eaf1ff_100%)] p-6 shadow-[0_36px_90px_-52px_rgba(53,93,168,0.45)]",
                className,
            ].join(" ")}
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#d7e3fb]/85 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-6 h-32 w-32 rounded-full bg-[#355da8]/18 blur-3xl" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                        <BrandLogoSlot
                            className="h-16 w-16 rounded-[1.5rem] p-2.5 md:h-20 md:w-20"
                            variant="header"
                        />

                        <div className="min-w-0">
                            {eyebrow ? (
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#355da8]">
                                    {eyebrow}
                                </p>
                            ) : null}
                            <h2 className="mt-2 text-2xl font-extrabold text-[#27498c] md:text-3xl">
                                {title}
                            </h2>
                            {description ? (
                                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5471ad] md:text-[15px]">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {actions ? (
                        <div className="mt-5 flex flex-wrap gap-3">
                            {actions}
                        </div>
                    ) : null}
                </div>

                {aside ? (
                    <div className="grid min-w-full gap-3 xl:min-w-[560px] xl:max-w-[560px]">
                        {aside}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
