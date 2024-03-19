docker compose -p prod down;
docker compose -p prod -f docker-compose.yml up --build -d --remove-orphans;
