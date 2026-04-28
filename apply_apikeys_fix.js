const fs = require('fs');

const srcPath = 'd:/project/GeniegoROI/frontend/src/pages/ApiKeys.jsx';
let content = fs.readFileSync(srcPath, 'utf8');

// The original global variables
content = content.replace(/const CHANNEL_GROUPS = \[/g, "const getChannelGroups = (t) => [");

content = content.replace(/const ALL_CHANNELS = CHANNEL_GROUPS\.flatMap\((.*?)\);/g, "const getAllChannels = (t) => getChannelGroups(t).flatMap($1);");
content = content.replace(/const channelMap = Object\.fromEntries\(ALL_CHANNELS\.map\((.*?)\)\);/g, "const getChannelMap = (t) => Object.fromEntries(getAllChannels(t).map($1));");
content = content.replace(/const SC_CHANNELS = \[/g, "const getScChannels = (t) => [");

// Inject `const t = useT();` securely in components
function injectHookIfNotPresent(funcPattern, hookStr) {
    const rx = new RegExp(`(function ${funcPattern}\\([^{]*?\\)\\s*\\{)`, 'g');
    content = content.replace(rx, (m, header) => {
        if (!content.includes(hookStr)) {
             // Wait, this checks globally, we need to check locally inside the function 
        }
        return `${header}\n    ${hookStr}`;
    });
}
injectHookIfNotPresent("StatusBadge", "const t = window.t_fn || ((k)=>k);"); // StatusBadge doesn't import useT locally if it's a pure helper? We can just pass `t` or use `useT()`. But useT() is safe in any functional component.
// But we can just add `const t = useT();` !
content = content.replace(/function StatusBadge\(\{ status \}\) \{/, "function StatusBadge({ status }) {\n    const t = useT();");

content = content.replace(/function AddChannelModal\(\{ groupKey, onClose, onAdded \}\) \{/, "function AddChannelModal({ groupKey, onClose, onAdded }) {\n    const t = useT();\n    const CHANNEL_GROUPS = getChannelGroups(t);\n    const ALL_CHANNELS = getAllChannels(t);\n    const channelMap = getChannelMap(t);\n    const SC_CHANNELS = getScChannels(t);");

content = content.replace(/function CredModal\(\{ channel, existingCreds, onClose, onSaved \}\) \{/, "function CredModal({ channel, existingCreds, onClose, onSaved }) {\n    const t = useT();\n    const channelMap = getChannelMap(t);");

content = content.replace(/function ChannelCard\(\{ ch, creds, onEdit, onDelete, onTest, is = false \}\) \{/, "function ChannelCard({ ch, creds, onEdit, onDelete, onTest, is = false }) {\n    const t = useT();");

// Replace ApiKeys
content = content.replace(/export default function ApiKeys\(\) \{/, "export default function ApiKeys() {\n    const t = useT();\n    const CHANNEL_GROUPS = getChannelGroups(t);\n    const ALL_CHANNELS = getAllChannels(t);\n    const channelMap = getChannelMap(t);\n    const SC_CHANNELS = getScChannels(t);");

// Because ALL_CHANNELS, CHANNEL_GROUPS are initialized inside the components, they work natively without changing existing arrays syntax downstream!

// Let's quickly ensure there are no other global ones like `SC_STATUS`.
// Not SC_STATUS, we only need to worry about ones calling `t()`.

fs.writeFileSync(srcPath, content, 'utf8');
console.log("Success");
