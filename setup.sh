#!/bin/bash

set -eu

pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db push