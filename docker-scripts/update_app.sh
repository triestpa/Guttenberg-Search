#!/usr/bin/env bash
docker-compose build api
docker-compose up --no-deps -d api