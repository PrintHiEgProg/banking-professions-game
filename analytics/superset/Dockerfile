# Superset той же версии, на которой проверен дашборд, + драйвер Postgres
FROM apache/superset:4.1.2
USER root
RUN pip install --no-cache-dir psycopg2-binary "setuptools<70"
USER superset
