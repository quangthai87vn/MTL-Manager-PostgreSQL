#!/bin/bash
set -e

# Fix permissions for data directory
chmod -R 777 /data 2>/dev/null || true

exec "$@"
