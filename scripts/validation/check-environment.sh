#!/usr/bin/env bash
# Environment Validation Script for GeniegoROI CCIS Part001

echo "=== GeniegoROI Environment Check ==="
echo "Date: $(date)"
echo "Git Branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')"
echo "Node Version: $(node -v 2>/dev/null || echo 'Not installed')"
echo "NPM Version: $(npm -v 2>/dev/null || echo 'Not installed')"
echo "PHP Version: $(php -v 2>/dev/null | head -n 1 || echo 'Not installed')"
echo "Python Version: $(python --version 2>/dev/null || echo 'Not installed')"
echo "Docker Version: $(docker --version 2>/dev/null || echo 'Not installed')"
echo "====================================="
