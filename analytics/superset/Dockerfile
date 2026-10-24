# Superset той же версии, на которой проверен дашборд, + драйвер Postgres и requests для bootstrap.py
FROM apache/superset:4.1.2
USER root
RUN pip install --no-cache-dir psycopg2-binary requests "setuptools<70"
USER superset
