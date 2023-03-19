#!/usr/bin/env bash

export NO_D1_WARNING=true

database="fuelprices_db"

echo "Executing migrations. Continue? [y,n]"
read input

if [ "$input" == "y" ]; then
#  npx wrangler d1 execute $database --file migrations/00_drop_tables.sql --local
  npx wrangler d1 execute $database --file migrations/01_create_fuelprices.sql --local

  if [ "$1" == "live" ]; then
#      npx wrangler d1 execute $database --file migrations/00_drop_tables.sql
      npx wrangler d1 execute $database --file migrations/01_create_fuelprices.sql
  fi
else
   exit 0
fi