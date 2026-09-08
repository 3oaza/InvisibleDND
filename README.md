# InvisibleDND (Ghost Mode) 👻

A **Vencord** user plugin that merges Discord's **Invisible** status with **Do Not Disturb (DND)** features:
- **Invisible presence**: To all other users and servers, you appear completely offline.
- **Do Not Disturb features**: Message pings, mentions, alerts, and notification sounds are silenced.
- **Selective incoming calls**: Incoming calls will still ring loudly and display the incoming call popup so you never miss urgent calls.

---

## ✨ Features & Controls

1. **Account Panel Quick Button**:
   - An SVG Ghost icon appears in your bottom-left user panel (next to Mute/Deafen).
   - Shows a red glow and DND indicator when active.
   - Click to toggle Ghost Mode on or off instantly.

2. **Slash Commands**:
   - `/ghost [enabled: true/false]`
   - `/invisiblednd [enabled: true/false]`

3. **Automatic Synchronization**:
   - When `autoEnableOnInvisible` is enabled (default: `true`), changing your Discord status to **Invisible** via the native status menu automatically activates DND suppression.

4. **Vencord Toolbox**:
   - An interactive toggle item in the Vencord Toolbox menu if installed.

---

## ⚙️ Settings

| Setting | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `autoEnableOnInvisible` | Boolean | `true` | Automatically enable DND suppression whenever your status is set to Invisible. |
| `allowCalls` | Boolean | `true` | Allow incoming calls to ring with audio and display incoming call popups. |
| `suppressNotificationSounds` | Boolean | `true` | Mute all notification sounds (messages, mentions, pings, user joins) while active. |
| `suppressDesktopNotifications` | Boolean | `true` | Suppress all desktop and OS notification banners while active. |
| `suppressUnreadBadges` | Boolean | `false` | Hide red unread mention badges while active (reduces visual distractions). |
| `showPanelButton` | Boolean | `true` | Show the quick toggle button in the bottom-left account panel next to mute/deafen. |

---

## 📥 Installation

1. Navigate to your Vencord directory.
2. Clone this repository into your `src/userplugins` folder:
   ```bash
   git clone https://github.com/3oaza/InvisibleDND.git src/userplugins/InvisibleDND
   ```
3. Build and inject Vencord:
   ```bash
   pnpm build
   pnpm inject
   ```
4. Restart Discord, go to **Settings > Vencord > Plugins**, and ensure **InvisibleDND** is enabled.

---

## 👤 Author

- **Fragment** ([@3oaza](https://github.com/3oaza))
- Discord: `879152978584563713`

---

## 📜 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
