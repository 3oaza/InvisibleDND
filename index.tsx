/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findComponentByCodeLazy, waitFor } from "@webpack";
import { Menu, NotificationSettingsStore } from "@webpack/common";

const Button = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    autoEnableOnInvisible: {
        type: OptionType.BOOLEAN,
        description: "Automatically enable Do Not Disturb suppression whenever your status is set to Invisible",
        default: true
    },
    allowCalls: {
        type: OptionType.BOOLEAN,
        description: "Allow incoming calls to ring with audio and display incoming call popups",
        default: true
    },
    suppressNotificationSounds: {
        type: OptionType.BOOLEAN,
        description: "Mute all notification sounds (messages, mentions, pings, user joins) while active",
        default: true
    },
    suppressDesktopNotifications: {
        type: OptionType.BOOLEAN,
        description: "Suppress all desktop and OS notifications while active",
        default: true
    },
    suppressUnreadBadges: {
        type: OptionType.BOOLEAN,
        description: "Hide red unread mention badges while active (reduces visual distractions)",
        default: false
    },
    showPanelButton: {
        type: OptionType.BOOLEAN,
        description: "Show the quick toggle button in the bottom-left account panel next to mute/deafen",
        default: true
    }
});

let manualActive = false;
let previousStatus = "online";

export function isGhostDndActive(): boolean {
    const status = StatusSettings?.getSetting?.() ?? "online";
    if (settings.store.autoEnableOnInvisible) {
        return status === "invisible";
    }
    return manualActive && status === "invisible";
}

export async function toggleGhostMode(): Promise<boolean> {
    const current = StatusSettings?.getSetting?.() ?? "online";
    const currentlyActive = isGhostDndActive();

    if (currentlyActive) {
        manualActive = false;
        const target = (previousStatus && previousStatus !== "invisible") ? previousStatus : "online";
        await StatusSettings?.updateSetting?.(target);
    } else {
        if (current !== "invisible") {
            previousStatus = current;
        }
        manualActive = true;
        await StatusSettings?.updateSetting?.("invisible");
    }

    try {
        NotificationSettingsStore?.emitChange?.();
    } catch {
        // Store may not support emitChange or not yet initialized
    }

    return !currentlyActive;
}

let origGetDesktopType: any = null;
let origIsSoundDisabled: any = null;
let origGetDisableUnreadBadge: any = null;

function applyStoreHooks(store: any) {
    if (!store || origGetDesktopType) return;

    origGetDesktopType = store.getDesktopType;
    origIsSoundDisabled = store.isSoundDisabled;
    origGetDisableUnreadBadge = store.getDisableUnreadBadge;

    store.getDesktopType = function() {
        if (isGhostDndActive() && settings.store.suppressDesktopNotifications) {
            return "NEVER";
        }
        return origGetDesktopType ? origGetDesktopType.call(this) : "ALL";
    };

    store.isSoundDisabled = function(sound: string) {
        if (isGhostDndActive()) {
            // Incoming or outgoing call ringtones: ALWAYS allow if allowCalls is enabled!
            if (settings.store.allowCalls && (sound === "call_ringing" || sound === "call_calling")) {
                return false;
            }
            if (settings.store.suppressNotificationSounds) {
                return true;
            }
        }
        return origIsSoundDisabled ? origIsSoundDisabled.call(this, sound) : false;
    };

    store.getDisableUnreadBadge = function() {
        if (isGhostDndActive() && settings.store.suppressUnreadBadges) {
            return true;
        }
        return origGetDisableUnreadBadge ? origGetDisableUnreadBadge.call(this) : false;
    };
}

function removeStoreHooks(store: any) {
    if (!store || !origGetDesktopType) return;
    store.getDesktopType = origGetDesktopType;
    store.isSoundDisabled = origIsSoundDisabled;
    store.getDisableUnreadBadge = origGetDisableUnreadBadge;
    origGetDesktopType = null;
    origIsSoundDisabled = null;
    origGetDisableUnreadBadge = null;
}

function GhostIcon({ active }: { active: boolean; }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {/* Ghost body */}
            <path
                d="M12 2C7.58 2 4 5.58 4 10v9.5c0 .6.47 1.07 1.05.97l2.45-.43 2.1 1.68c.4.32.97.32 1.37 0l2.03-1.62 2.03 1.62c.4.32.97.32 1.37 0l2.1-1.68 2.45.43c.58.1 1.05-.37 1.05-.97V10c0-4.42-3.58-8-8-8Z"
                fill={active ? "var(--status-danger, #f23f43)" : "currentColor"}
                opacity={active ? 1 : 0.8}
            />
            {/* Ghost Eyes */}
            <circle cx="9" cy="9.5" r="1.5" fill={active ? "#ffffff" : "var(--background-secondary, #2b2d31)"} />
            <circle cx="15" cy="9.5" r="1.5" fill={active ? "#ffffff" : "var(--background-secondary, #2b2d31)"} />
            {/* DND indicator bar when active */}
            {active && (
                <rect x="7.5" y="13.5" width="9" height="2" rx="1" fill="#ffffff" />
            )}
        </svg>
    );
}

function InvisibleDndButton(props: { nameplate?: any; }) {
    const { showPanelButton, autoEnableOnInvisible } = settings.use(["showPanelButton", "autoEnableOnInvisible"]);
    const status = StatusSettings.useSetting();

    if (!showPanelButton) return null;

    const active = autoEnableOnInvisible ? status === "invisible" : (manualActive && status === "invisible");

    return (
        <Button
            tooltipText={active ? "Disable Invisible DND (Ghost Mode)" : "Enable Invisible DND (Ghost Mode)"}
            icon={() => <GhostIcon active={active} />}
            role="switch"
            aria-checked={active}
            redGlow={active}
            plated={props?.nameplate != null}
            onClick={() => void toggleGhostMode()}
        />
    );
}

export default definePlugin({
    name: "InvisibleDND",
    description: "Merges Invisible status with Do Not Disturb features: appear offline, suppress pings & notifications, but still hear incoming calls.",
    tags: ["Notifications", "Privacy", "Utility"],
    authors: [
        Devs.Fragment ?? {
            name: "Fragment",
            id: 879152978584563713n
        }
    ],
    dependencies: ["UserSettingsAPI"],
    settings,

    start() {
        if (NotificationSettingsStore) {
            applyStoreHooks(NotificationSettingsStore);
        } else {
            waitFor(filters.byStoreName("NotificationSettingsStore"), (s: any) => {
                applyStoreHooks(s);
            });
        }
    },

    stop() {
        removeStoreHooks(NotificationSettingsStore);
    },

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /children:\[(?=[^\]]{0,150}?accountContainerRef)/,
                replace: "children:[$self.InvisibleDndButton(arguments[0]),"
            }
        }
    ],

    toolboxActions() {
        const status = StatusSettings.useSetting();
        const { autoEnableOnInvisible } = settings.use(["autoEnableOnInvisible"]);
        const active = autoEnableOnInvisible ? status === "invisible" : (manualActive && status === "invisible");

        return (
            <Menu.MenuCheckboxItem
                id="invisible-dnd-toolbox"
                label="Invisible DND (Ghost Mode)"
                checked={active}
                action={() => void toggleGhostMode()}
            />
        );
    },

    commands: [
        {
            name: "ghost",
            description: "Toggle Invisible DND (Ghost Mode)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "enabled",
                    description: "Explicitly enable or disable Ghost Mode",
                    required: false,
                    type: ApplicationCommandOptionType.BOOLEAN,
                },
            ],
            execute: async (args, ctx) => {
                const explicit = findOption(args, "enabled", null);
                const currentlyActive = isGhostDndActive();
                const shouldBeActive = explicit !== null ? explicit : !currentlyActive;

                if (shouldBeActive === currentlyActive) {
                    sendBotMessage(ctx.channel.id, {
                        content: `👻 Invisible DND is already **${currentlyActive ? "enabled" : "disabled"}**.`,
                    });
                    return;
                }

                await toggleGhostMode();

                sendBotMessage(ctx.channel.id, {
                    content: shouldBeActive
                        ? "👻 **Invisible DND (Ghost Mode) enabled!** You appear offline to others, message & mention notifications are silenced, and incoming calls will still ring."
                        : "👻 **Invisible DND (Ghost Mode) disabled!** Restored normal status and notifications.",
                });
            },
        },
        {
            name: "invisiblednd",
            description: "Toggle Invisible DND (Ghost Mode)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "enabled",
                    description: "Explicitly enable or disable Ghost Mode",
                    required: false,
                    type: ApplicationCommandOptionType.BOOLEAN,
                },
            ],
            execute: async (args, ctx) => {
                const explicit = findOption(args, "enabled", null);
                const currentlyActive = isGhostDndActive();
                const shouldBeActive = explicit !== null ? explicit : !currentlyActive;

                if (shouldBeActive === currentlyActive) {
                    sendBotMessage(ctx.channel.id, {
                        content: `👻 Invisible DND is already **${currentlyActive ? "enabled" : "disabled"}**.`,
                    });
                    return;
                }

                await toggleGhostMode();

                sendBotMessage(ctx.channel.id, {
                    content: shouldBeActive
                        ? "👻 **Invisible DND (Ghost Mode) enabled!** You appear offline to others, message & mention notifications are silenced, and incoming calls will still ring."
                        : "👻 **Invisible DND (Ghost Mode) disabled!** Restored normal status and notifications.",
                });
            },
        }
    ],

    InvisibleDndButton: ErrorBoundary.wrap(InvisibleDndButton, { noop: true }),
});
