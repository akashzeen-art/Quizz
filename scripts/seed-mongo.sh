#!/usr/bin/env bash
# Questions and sample quizzes are inserted automatically on first startup by
# Spring Boot (see backend DataInitializer + QuestionSeedGenerator).
#
# Usage with MongoDB Atlas:
#   export MONGODB_URI='mongodb+srv://USER:PASS@HOST/skill_quiz?retryWrites=true&w=majority'
#   export CORS_ORIGINS='http://localhost:5173'
#   cd "$(dirname "$0")/../backend" && mvn spring-boot:run
#
# Ensure the database is empty (or drop collections `questions` and `quizzes`) to re-seed.

set -euo pipefail
echo "Run the backend once; seeding runs automatically when collections are empty."
echo "Set MONGODB_URI for Atlas (see comments in this script)."
