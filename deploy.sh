#!/bin/bash
set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="1.201.177.46"
REMOTE_PATH="/home/wwwroot/roi.geniego.com/frontend/dist"
# Adjust this to the directory produced by your build step (e.g., build, dist, public)
LOCAL_BUILD_DIR="./frontend/dist"

# Ensure the build directory exists
if [ ! -d "$LOCAL_BUILD_DIR" ]; then
  echo "Build directory $LOCAL_BUILD_DIR does not exist. Exiting."
  exit 1
fi

# Sync files to the remote server using rsync over SSH
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" "$LOCAL_BUILD_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

echo "Deployment completed successfully."
