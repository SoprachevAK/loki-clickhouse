docker compose -p prod down;
docker compose -p prod -f docker-compose.yaml up --build -d --remove-orphans;
