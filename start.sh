#!/bin/sh
set -e

echo "Deploying database migrations..."
npx prisma migrate deploy

echo "Starting Next.js app..."
exec npm start
