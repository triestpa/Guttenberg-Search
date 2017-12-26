#!/usr/bin/env bash
docker-compose build app
docker-compose up --no-deps -d app