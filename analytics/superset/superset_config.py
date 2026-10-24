# Настройки Superset для дашборда «Профессии в Банке — HR».
# Используется и в docker-compose.yml, и при запуске без Docker (SUPERSET_CONFIG_PATH=путь/к/этому/файлу).
import os

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change-me-please-a-long-random-string")
# Метаданные самого Superset (пользователи, дашборды). Данные игры лежат в отдельной базе Postgres.
SQLALCHEMY_DATABASE_URI = os.environ.get("SUPERSET_METADATA_URI", "sqlite:////app/superset_home/superset.db")

# Интерфейс на русском
BABEL_DEFAULT_LOCALE = "ru"
LANGUAGES = {"ru": {"flag": "ru", "name": "Русский"}, "en": {"flag": "us", "name": "English"}}

# Дашборд можно открыть без логина для просмотра (роль Public = Gamma), если задать SUPERSET_PUBLIC=1
if os.environ.get("SUPERSET_PUBLIC") == "1":
    PUBLIC_ROLE_LIKE = "Gamma"

ROW_LIMIT = 50000
SQLLAB_TIMEOUT = 60
