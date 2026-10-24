# Настройки Superset для дашборда «Профессии в Банке — HR».
# Используется и в docker-compose.yml, и при запуске без Docker (SUPERSET_CONFIG_PATH=путь/к/этому/файлу).
import os

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change-me-please-a-long-random-string")
# Метаданные самого Superset (пользователи, дашборды). Данные игры лежат в отдельной базе Postgres.
SQLALCHEMY_DATABASE_URI = os.environ.get("SUPERSET_METADATA_URI", "sqlite:////app/superset_home/superset.db")

# Интерфейс на русском
BABEL_DEFAULT_LOCALE = "ru"
LANGUAGES = {"ru": {"flag": "ru", "name": "Русский"}, "en": {"flag": "us", "name": "English"}}

# Доступ к дашборду по ролям: дашборд, открытый роли Public, виден по ссылке без логина
FEATURE_FLAGS = {"DASHBOARD_RBAC": True}

# Публичный просмотр (для жюри по QR): SUPERSET_PUBLIC=1 + bootstrap.py --public.
# Гость видит только опубликованные дашборды, которым выдана роль Public; править ничего не может.
if os.environ.get("SUPERSET_PUBLIC") == "1":
    PUBLIC_ROLE_LIKE = "Gamma"

# За обратным прокси с HTTPS (Caddy/nginx на своём домене)
if os.environ.get("SUPERSET_PROXY_FIX") == "1":
    ENABLE_PROXY_FIX = True

ROW_LIMIT = 50000
SQLLAB_TIMEOUT = 60
