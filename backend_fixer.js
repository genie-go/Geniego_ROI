const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const backendSrcPath = 'd:/project/GeniegoROI/backend';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

walkDir(backendSrcPath, (filePath) => {
    if (!filePath.endsWith('.php')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Use regex to fix $tenantId = 'demo'
    // Controllers and Handlers
    content = content.replace(/\/\/ \$auth = Auth::requireAuth\(\);\s*\$tenantId = 'demo';/g, () => {
        changed = true;
        return `$auth = \\Genie\\Helpers\\Auth::requireAuth();\n        $tenantId = $auth['tenant_id'];`;
    });

    content = content.replace(/\/\/ \$auth = Auth::requireAuth\(\);\s*\n\s*\$tenantId = 'demo';/g, () => {
        changed = true;
        return `$auth = \\Genie\\Helpers\\Auth::requireAuth();\n        $tenantId = $auth['tenant_id'];`;
    });

    content = content.replace(/\/\/ For simplicity in this demo environment.*?\n\s*\$userId = 'demo';\s*\n\s*\$userPlan = 'free';/g, () => {
        changed = true;
        return `// Use actual auth
        $auth = \\Genie\\Helpers\\Auth::requireAuth();
        $userId = $auth['tenant_id'];
        $userPlan = $auth['plan'] ?? 'pro';`;
    });

    // Fix Connectors.php mock rows
    if (filePath.includes('Connectors.php')) {
        content = content.replace(/'mock'\s*=>\s*true/g, () => {
            changed = true;
            return `'mock' => false`;
        });
    }

    // Globally change $plan === 'demo' to false
    content = content.replace(/\$plan\s*===\s*'demo'/g, () => {
        changed = true;
        return `false /*was demo*/`;
    });

    // Replaces the isDemo method body
    if (content.includes('function isDemo()')) {
        content = content.replace(/in_array\(\$this->userPlan, \['free', 'growth'\]\);/g, () => {
            changed = true;
            return `false; // Demo removed`;
        });
        
        content = content.replace(/in_array\(\$this->userPlan, \['free', 'demo', 'growth'\]\);/g, () => {
            changed = true;
            return `false; // Demo removed`;
        });
    }

    // In Auth / Admin to ensure new users are given PRO, not DEMO
    if (content.includes("['demo', 'starter'")) {
        content = content.replace(/'demo'/g, () => {
            changed = true;
            return `'pro' /*replaced demo*/`;
        });
    }
    
    // Auth fallback
    content = content.replace(/\$plan\s*=\s*in_array\(\$body\['plan'\] \?\? 'pro', \['pro', 'demo', 'enterprise'\], true\)\n\s*\?\s*\$body\['plan'\] \?\? 'pro'\n\s*:\s*'pro';/g, () => {
        changed = true;
        return `$plan = in_array($body['plan'] ?? 'pro', ['pro', 'enterprise'], true) ? $body['plan'] ?? 'pro' : 'pro';`;
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Patched: ' + filePath);
    }
});
