"""Собирает дашборд «Профессии в Банке — HR-аналитика» в Superset одной командой.

Что делает:
  1) в базе Postgres создаёт таблицу событий (если её нет) и представления для графиков (analytics/views.sql);
  2) в Superset подключает эту базу, создаёт наборы данных, графики и дашборд (повторный запуск пересобирает его).

Запуск:
  pip install requests psycopg2-binary
  python bootstrap.py --superset http://localhost:8088 --user admin --password admin \
                      --db "postgres://user:pass@host/db?sslmode=require"
Если Superset в Docker, а база на этом же компьютере, передай для Superset отдельный адрес базы:
  --superset-db "postgresql://user:pass@host.docker.internal:5432/db"
"""
import argparse
import json
import os
import re
import sys
import uuid

import psycopg2
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DB_NAME = "Профессии в Банке — статистика"
SLUG = "professii-hr"
TITLE = "Профессии в Банке — HR-аналитика"


def sa_uri(url):
    """postgres://… → postgresql+psycopg2://… (формат SQLAlchemy для Superset)."""
    for p in ("postgres://", "postgresql://"):
        if url.startswith(p):
            return "postgresql+psycopg2://" + url[len(p):]
    return url


def apply_sql(db_url):
    con = psycopg2.connect(db_url)
    cur = con.cursor()
    for f in ("schema.sql", "views.sql"):
        cur.execute(open(os.path.join(ROOT, f), encoding="utf-8").read())
    con.commit()
    con.close()
    print("✓ Таблица и представления в базе готовы")


class Superset:
    def __init__(self, base, user, password):
        self.base = base.rstrip("/")
        self.s = requests.Session()
        # По HTTPS Superset (Flask-WTF) принимает форму только с Referer своего же адреса
        self.s.headers["Referer"] = f"{self.base}/login/"
        # Вход как в браузере (сессия): при публичном режиме Superset не читает API-токен у «публичных» запросов
        # и считает скрипт гостем. Токен оставляем запасным путём (Superset с внешней авторизацией).
        page = self.s.get(f"{self.base}/login/")
        m = re.search(r'name="csrf_token"[^>]*value="([^"]+)"', page.text) or re.search(r'value="([^"]+)"[^>]*name="csrf_token"', page.text)
        if m:
            self.s.post(f"{self.base}/login/", data={"username": user, "password": password, "csrf_token": m.group(1)}, allow_redirects=True)
        r = self.s.post(f"{self.base}/api/v1/security/login", json={"username": user, "password": password, "provider": "db", "refresh": True})
        if r.status_code == 401:
            raise SystemExit(f"Superset: неверный логин или пароль для «{user}» (--user / --password).")
        r.raise_for_status()
        self.s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        r = self.s.get(f"{self.base}/api/v1/security/csrf_token/")
        r.raise_for_status()
        self.s.headers["X-CSRFToken"] = r.json()["result"]
        self.s.headers["Referer"] = self.base
        me = self.s.get(f"{self.base}/api/v1/me/")
        if me.status_code != 200:
            raise RuntimeError(
                f"Superset не пустил скрипт как {user} (ответ {me.status_code}). Проверь пароль; "
                "если Superset за HTTPS-прокси — что в нём включён SUPERSET_PROXY_FIX=1."
            )

    def call(self, method, path, **kw):
        r = self.s.request(method, f"{self.base}/api/v1/{path}", **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"{method} {path} → {r.status_code}: {r.text[:500]}")
        return r.json() if r.text else {}

    def find(self, kind, col, value):
        q = f"(filters:!((col:{col},opr:eq,value:'{value}')),page_size:100)"
        return self.call("GET", f"{kind}/?q={q}").get("result", [])


def metric(sql, label):
    return {"expressionType": "SQL", "sqlExpression": sql, "label": label, "hasCustomLabel": True, "optionName": "metric_" + uuid.uuid4().hex[:10]}


# Подписи колонок по-русски (для таблиц и подсказок)
VERBOSE = {
    "prof_title": "Профессия", "players_entered": "Зашли в кабинет", "players_played": "Сыграли смену", "shifts_played": "Смен сыграно",
    "avg_stars": "Средние звёзды", "like_love": "😍 Очень", "like_ok": "🙂 Нормально", "like_no": "😐 Не моё", "love_pct": "😍, %",
    "recommended": "Профиль советует", "age_label": "Возраст", "device_label": "Устройство", "players": "Игроки", "stage": "Этап",
    "day": "День", "shifts": "Смены", "new_players": "Новые игроки", "match_pct": "Совпадение, %",
}


def charts():
    """(набор данных, название, viz_type, параметры, ширина, высота)."""
    big = lambda col, label, sub: ("v_kpi", label, "big_number_total", {"metric": metric(f"MAX({col})", label), "subheader": sub, "y_axis_format": ",d", "header_font_size": 0.4, "subheader_font_size": 0.13}, 3, 32)
    return [
        [
            big("players", "Игроков", "уникальные браузеры, без имён"),
            big("shifts", "Сыграно смен", "во всех 5 профессиях"),
            big("profiles", "Получили профиль", "попробовали все 5 профессий"),
            big("career_clicks", "Открыли «Карьера в банке»", "перешли на страницу стажировки"),
        ],
        [
            ("v_prof_interest", "Какие профессии выбирают", "echarts_timeseries_bar", {
                "x_axis": "prof_title", "metrics": [metric("SUM(players_played)", "Сыграли смену"), metric("SUM(recommended)", "Профиль советует")],
                "groupby": [], "orientation": "horizontal", "row_limit": 100, "show_legend": True, "legendOrientation": "top",
                "show_value": True, "rich_tooltip": True, "y_axis_format": "SMART_NUMBER", "x_axis_sort_asc": True,
                "x_axis_title": "", "y_axis_title": "", "truncateYAxis": False,
            }, 6, 60),
            ("v_prof_interest", "Как тебе эта работа? (ответы после смены)", "echarts_timeseries_bar", {
                "x_axis": "prof_title", "metrics": [metric("SUM(like_love)", "😍 Очень"), metric("SUM(like_ok)", "🙂 Нормально"), metric("SUM(like_no)", "😐 Не моё")],
                "groupby": [], "orientation": "horizontal", "stack": "Stack", "row_limit": 100, "show_legend": True, "legendOrientation": "top",
                "rich_tooltip": True, "y_axis_format": "SMART_NUMBER", "x_axis_sort_asc": True,
            }, 6, 60),
        ],
        [
            ("v_funnel", "Воронка: от запуска до страницы стажировки", "funnel", {
                "groupby": ["stage"], "metric": metric("SUM(players)", "Игроки"), "row_limit": 10, "sort_by_metric": True,
                "show_labels": True, "show_legend": False, "number_format": ",d", "percent_calculation_type": "first_step",
                # у воронки тип подписи — число: 5 = «название, значение и %»
                "label_type": 5, "tooltip_label_type": 5,
            }, 6, 62),
            ("v_prof_interest", "Что советует профиль стажёра", "pie", {
                "groupby": ["prof_title"], "metric": metric("SUM(recommended)", "Рекомендаций"), "row_limit": 100, "sort_by_metric": True,
                "donut": True, "innerRadius": 40, "outerRadius": 70, "show_labels": True, "label_type": "percent", "labels_outside": True,
                "label_line": True, "show_legend": True, "legendOrientation": "bottom", "legendType": "plain", "number_format": ",d",
            }, 6, 62),
        ],
        [
            ("v_daily", "Игроки и смены по дням", "echarts_timeseries_line", {
                "x_axis": "day", "time_grain_sqla": "P1D", "metrics": [metric("SUM(players)", "Игроки"), metric("SUM(shifts)", "Смены")],
                "groupby": [], "time_range": "No filter", "rich_tooltip": True, "show_legend": True, "legendOrientation": "top",
                "markerEnabled": True, "x_axis_time_format": "%d.%m", "y_axis_format": "SMART_NUMBER", "row_limit": 1000,
            }, 8, 52),
            ("v_devices", "С чего играют", "pie", {
                "groupby": ["device_label"], "metric": metric("SUM(players)", "Игроки"), "row_limit": 10, "sort_by_metric": True,
                "donut": True, "innerRadius": 40, "outerRadius": 70, "show_labels": True, "label_type": "percent", "labels_outside": True,
                "show_legend": True, "legendOrientation": "bottom",
            }, 4, 52),
        ],
        [
            ("v_age_prof", "Возраст × профессия (сыграли хотя бы смену)", "pivot_table_v2", {
                "groupbyRows": ["Профессия"], "groupbyColumns": ["Возраст"], "metrics": [metric("SUM(players)", "Игроки")],
                "metricsLayout": "COLUMNS", "aggregateFunction": "Sum", "rowTotals": True, "colTotals": True, "valueFormat": "SMART_NUMBER",
                "row_limit": 1000, "rowOrder": "value_z_to_a", "colOrder": "key_a_to_z", "combineMetric": False, "transposePivot": False,
            }, 6, 52),
            ("v_prof_interest", "Сводка по профессиям", "table", {
                "query_mode": "raw", "all_columns": ["prof_title", "players_entered", "players_played", "shifts_played", "avg_stars", "love_pct", "recommended"],
                "order_by_cols": [json.dumps(["ord", True])], "row_limit": 100, "server_pagination": False, "include_search": False,
                "show_cell_bars": False, "table_timestamp_format": "smart_date",
            }, 6, 52),
        ],
    ]


HEADER_MD = """## 🏦 Профессии в Банке — какие профессии выбирают подростки
Анонимная статистика игры: **без имён, регистрации и IP** — случайный id браузера. Возраст — по выбранной сложности
(7–10, 11–13, 14+). «Как тебе эта работа?» — ответ игрока после смены. «Профиль советует» — профессия, которую игра
рекомендовала после всех 5 кабинетов. Дашборд обновляется сам раз в минуту. Демо-данные помечены в базе `source = 'demo'`."""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--superset", default=os.environ.get("SUPERSET_URL", "http://localhost:8088"))
    ap.add_argument("--user", default=os.environ.get("SUPERSET_USER", "admin"))
    ap.add_argument("--password", default=os.environ.get("SUPERSET_PASSWORD", "admin"))
    ap.add_argument("--db", default=os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL"), help="адрес базы для этого скрипта")
    ap.add_argument("--superset-db", default=os.environ.get("SUPERSET_DATABASE_URL"), help="адрес базы, как его видит Superset (если отличается)")
    ap.add_argument("--public", action="store_true", help="открыть дашборд по ссылке без логина (нужен SUPERSET_PUBLIC=1 в Superset)")
    a = ap.parse_args()
    if not a.db:
        sys.exit("Нужен адрес базы: --db или DATABASE_URL")

    apply_sql(a.db)
    ss = Superset(a.superset, a.user, a.password)
    print("✓ Вход в Superset")

    # 1. База
    uri = sa_uri(a.superset_db or a.db)
    found = ss.find("database", "database_name", DB_NAME)
    if found:
        db_id = found[0]["id"]
        ss.call("PUT", f"database/{db_id}", json={"sqlalchemy_uri": uri, "expose_in_sqllab": True})
    else:
        db_id = ss.call("POST", "database/", json={"database_name": DB_NAME, "sqlalchemy_uri": uri, "expose_in_sqllab": True})["id"]
    print(f"✓ База подключена (id {db_id})")

    # 2. Наборы данных
    ds = {}
    for name in ("v_kpi", "v_prof_interest", "v_funnel", "v_daily", "v_age_prof", "v_devices"):
        hit = [d for d in ss.find("dataset", "table_name", name) if d.get("database", {}).get("id") == db_id]
        if hit:
            ds_id = hit[0]["id"]
            ss.call("PUT", f"dataset/{ds_id}/refresh")
        else:
            ds_id = ss.call("POST", "dataset/", json={"database": db_id, "schema": "public", "table_name": name})["id"]
        # подписи колонок по-русски
        cols = ss.call("GET", f"dataset/{ds_id}")["result"]["columns"]
        upd = []
        for c in cols:
            item = {"id": c["id"], "column_name": c["column_name"], "verbose_name": VERBOSE.get(c["column_name"], c.get("verbose_name")), "is_dttm": c["column_name"] == "day" or bool(c.get("is_dttm")), "type": c.get("type")}
            upd.append(item)
        try:
            ss.call("PUT", f"dataset/{ds_id}", json={"columns": upd, "main_dttm_col": "day" if name == "v_daily" else None})
        except RuntimeError as e:
            print(f"  (подписи для {name} не обновлены: {e})")
        ds[name] = ds_id
    print(f"✓ Наборы данных: {', '.join(ds)}")

    # 3. Пересобрать дашборд
    for old in ss.find("dashboard", "slug", SLUG):
        for c in ss.call("GET", f"dashboard/{old['id']}/charts").get("result", []):
            try:
                ss.call("DELETE", f"chart/{c['id']}")
            except RuntimeError:
                pass
        ss.call("DELETE", f"dashboard/{old['id']}")
    dash = ss.call("POST", "dashboard/", json={"dashboard_title": TITLE, "slug": SLUG, "published": True})
    dash_id = dash["id"]

    pos = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
        "GRID_ID": {"type": "GRID", "id": "GRID_ID", "children": [], "parents": ["ROOT_ID"]},
        "HEADER_ID": {"id": "HEADER_ID", "type": "HEADER", "meta": {"text": TITLE}},
    }
    row_md = "ROW-header"
    pos["GRID_ID"]["children"].append(row_md)
    pos[row_md] = {"type": "ROW", "id": row_md, "children": ["MARKDOWN-header"], "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}}
    pos["MARKDOWN-header"] = {"type": "MARKDOWN", "id": "MARKDOWN-header", "children": [], "parents": ["ROOT_ID", "GRID_ID", row_md], "meta": {"width": 12, "height": 26, "code": HEADER_MD}}

    made = 0
    for ri, row in enumerate(charts()):
        rid = f"ROW-{ri}"
        pos["GRID_ID"]["children"].append(rid)
        pos[rid] = {"type": "ROW", "id": rid, "children": [], "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}}
        for ci, (dsn, name, viz, params, w, h) in enumerate(row):
            form = {"viz_type": viz, "datasource": f"{ds[dsn]}__table", "adhoc_filters": [], "color_scheme": "supersetColors", **params}
            chart = ss.call("POST", "chart/", json={"slice_name": name, "viz_type": viz, "datasource_id": ds[dsn], "datasource_type": "table", "params": json.dumps(form), "dashboards": [dash_id]})
            cid = chart["id"]
            ch_uuid = ss.call("GET", f"chart/{cid}")["result"].get("uuid") or str(uuid.uuid4())
            key = f"CHART-{ri}-{ci}"
            pos[rid]["children"].append(key)
            pos[key] = {"type": "CHART", "id": key, "children": [], "parents": ["ROOT_ID", "GRID_ID", rid], "meta": {"chartId": cid, "width": w, "height": h, "sliceName": name, "uuid": ch_uuid}}
            made += 1

    meta = {"refresh_frequency": 60, "color_scheme": "supersetColors", "timed_refresh_immune_slices": [], "expanded_slices": {}, "label_colors": {}, "positions": pos, "native_filter_configuration": []}
    upd = {"position_json": json.dumps(pos), "json_metadata": json.dumps(meta)}
    if a.public:
        roles = ss.call("GET", "dashboard/related/roles?q=(page_size:100)").get("result", [])
        pub = [r["value"] for r in roles if r.get("text") == "Public"]
        if pub:
            upd["roles"] = pub
        else:
            print("  (роль Public не найдена: запусти Superset с SUPERSET_PUBLIC=1 и выполни superset init)")
    ss.call("PUT", f"dashboard/{dash_id}", json=upd)
    print(f"✓ Дашборд «{TITLE}»: {made} графиков → {a.superset.rstrip('/')}/superset/dashboard/{SLUG}/")
    if a.public and upd.get("roles"):
        print("✓ Открыт для просмотра без логина (роль Public)")


if __name__ == "__main__":
    main()
