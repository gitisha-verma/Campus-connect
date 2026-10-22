
from flask import (
    Flask, request, jsonify, render_template, session,
    send_from_directory, redirect, url_for
)
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
import re

app = Flask(
    __name__,
    static_folder="../frontend/static",
    static_url_path="/static",
    template_folder="../frontend/templates"
)

app.secret_key = "campus-connect-secret"


# ============================================================
# DATABASE AND AUTHENTICATION HELPERS
# ============================================================

def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn


def is_admin_authenticated():
    return (
        session.get("admin_id") is not None
        and session.get("admin_role") == "admin"
    )


def admin_api_unauthorized_response():
    return jsonify({
        "message": "Unauthorized. Admin access is required."
    }), 401


def get_json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return data


def ensure_resource_category_column(conn):
    """
    Add category to older databases if it is missing.
    Existing resource rows are preserved and receive 'General'.
    """
    columns = conn.execute("PRAGMA table_info(resources)").fetchall()
    column_names = {column["name"] for column in columns}

    if "category" not in column_names:
        conn.execute(
            "ALTER TABLE resources ADD COLUMN category "
            "TEXT NOT NULL DEFAULT 'General'"
        )
        conn.commit()


def validate_person_name(name):
    if not isinstance(name, str):
        return None

    name = name.strip()

    if len(name) < 2 or len(name) > 100:
        return None

    if not any(character.isalpha() for character in name):
        return None

    if any(character.isdigit() or character in "<>" for character in name):
        return None

    return name


def validate_email(email):
    if not isinstance(email, str):
        return None

    email = email.strip().lower()

    if len(email) > 254:
        return None

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return None

    return email


def validate_event_payload(data):
    if not isinstance(data, dict):
        return None, "A valid JSON request body is required."

    title = data.get("title")
    description = data.get("description", "")
    event_date = data.get("date")
    event_time = data.get("time", "")
    location = data.get("location", "")

    if not all(isinstance(value, str) for value in (
        title, description, event_date, event_time, location
    )):
        return None, "Event fields must contain text."

    title = title.strip()
    description = description.strip()
    event_date = event_date.strip()
    event_time = event_time.strip()
    location = location.strip()

    if not title:
        return None, "Event title is required."
    if len(title) > 200:
        return None, "Event title cannot exceed 200 characters."
    if len(description) > 5000:
        return None, "Event description cannot exceed 5000 characters."
    if not event_date:
        return None, "Event date is required."
    if len(event_time) > 50:
        return None, "Event time cannot exceed 50 characters."
    if len(location) > 250:
        return None, "Event location cannot exceed 250 characters."

    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except ValueError:
        return None, "Please provide a valid event date in YYYY-MM-DD format."

    return {
        "title": title,
        "description": description,
        "date": event_date,
        "time": event_time,
        "location": location
    }, None


def validate_resource_payload(data):
    if not isinstance(data, dict):
        return None, "A valid JSON request body is required."

    title = data.get("title")
    description = data.get("description", "")
    link = data.get("link")
    category = data.get("category", "General")

    if not all(isinstance(value, str) for value in (
        title, description, link, category
    )):
        return None, "Resource fields must contain text."

    title = title.strip()
    description = description.strip()
    link = link.strip()
    category = category.strip()

    if not title:
        return None, "Resource title is required."
    if len(title) > 200:
        return None, "Resource title cannot exceed 200 characters."
    if len(description) > 5000:
        return None, "Resource description cannot exceed 5000 characters."
    if not link:
        return None, "Resource link is required."
    if len(link) > 2048:
        return None, "Resource link cannot exceed 2048 characters."
    if not link.startswith(("https://", "http://")):
        return None, "Resource link must start with http:// or https://."
    if len(category) > 80:
        return None, "Resource category cannot exceed 80 characters."
    if not category:
        return None, "Resource category is required."

    return {
        "title": title,
        "description": description,
        "link": link,
        "category": category
    }, None


# ============================================================
# FEATURE 1 - STUDENT SIGNUP AND LOGIN
# ============================================================

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all(isinstance(value, str) for value in (name, email, password)):
        return jsonify({"message": "Name, email, and password are required."}), 400

    name = name.strip()
    email = email.strip().lower()

    if not name or not validate_email(email) or not password:
        return jsonify({"message": "Please provide valid signup details."}), 400

    hashed_password = generate_password_hash(password)
    conn = get_db_connection()

    try:
        conn.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (name, email, hashed_password)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        return jsonify({"message": "An account with this email may already exist."}), 409
    finally:
        conn.close()

    return jsonify({
        "message": "Signup request received",
        "name": name,
        "email": email
    }), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"message": "Email and password are required."}), 400

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.strip().lower(),)
        ).fetchone()
    finally:
        conn.close()

    if user is None or not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    session["student_name"] = user["name"]
    session["user_id"] = user["id"]

    return jsonify({
        "message": "Login successful",
        "name": user["name"],
        "email": user["email"]
    })


# ============================================================
# FEATURE 8.1 - ADMIN LOGIN
# ============================================================

@app.route("/admin-login", methods=["GET", "POST"])
def admin_login():
    if request.method == "GET":
        return render_template("admin_login.html")

    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")

    if not username or not password:
        return jsonify({"message": "Email and password are required."}), 400

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (username,)
        ).fetchone()
    finally:
        conn.close()

    if user is None or not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid admin credentials."}), 401

    if user["role"] != "admin":
        return jsonify({"message": "Access denied. Admin account required."}), 403

    session["admin_id"] = user["id"]
    session["admin_name"] = user["name"]
    session["admin_role"] = user["role"]

    return redirect(url_for("admin_dashboard"))


# ============================================================
# FEATURE 8.2 - ADMIN DASHBOARD AND LOGOUT
# ============================================================

@app.route("/admin-dashboard")
def admin_dashboard():
    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))

    conn = get_db_connection()
    try:
        total_students = conn.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'student'"
        ).fetchone()[0]
        total_notices = conn.execute(
            "SELECT COUNT(*) FROM notices"
        ).fetchone()[0]
        total_events = conn.execute(
            "SELECT COUNT(*) FROM events"
        ).fetchone()[0]
        total_resources = conn.execute(
            "SELECT COUNT(*) FROM resources"
        ).fetchone()[0]
        total_discussions = conn.execute(
            "SELECT COUNT(*) FROM discussions"
        ).fetchone()[0]
    finally:
        conn.close()

    return render_template(
        "admin_dashboard.html",
        admin_name=session.get("admin_name", "Administrator"),
        total_students=total_students,
        total_notices=total_notices,
        total_events=total_events,
        total_resources=total_resources,
        total_discussions=total_discussions
    )


@app.route("/admin-logout")
def admin_logout():
    session.pop("admin_id", None)
    session.pop("admin_name", None)
    session.pop("admin_role", None)
    return redirect(url_for("admin_login"))


# ============================================================
# DASHBOARD AND STUDENT LOGOUT
# ============================================================

@app.route("/dashboard-data")
def dashboard_data():
    return jsonify({"studentName": session.get("student_name", "Student")})


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("dashboard.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


# ============================================================
# FEATURE 3 - STUDENT NOTICES
# ============================================================

@app.route("/api/notices")
def get_notices():
    conn = get_db_connection()
    try:
        notices = conn.execute(
            "SELECT id, title, content, date, category "
            "FROM notices ORDER BY date DESC"
        ).fetchall()
    finally:
        conn.close()
    return jsonify([dict(notice) for notice in notices])


@app.route("/notices")
def notices_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("notices.html")


@app.route("/admin-notices")
def admin_notices_page():
    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))
    return render_template(
        "admin_notices.html",
        admin_name=session.get("admin_name", "Administrator")
    )


# ============================================================
# FEATURE 8.3 - ADMIN NOTICE CRUD
# ============================================================

@app.route("/api/admin/notices", methods=["GET", "POST"])
def admin_notices_api():
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    if request.method == "GET":
        conn = get_db_connection()
        try:
            notices = conn.execute(
                "SELECT id, title, content, date, category "
                "FROM notices ORDER BY date DESC, id DESC"
            ).fetchall()
            return jsonify({"notices": [dict(notice) for notice in notices]})
        finally:
            conn.close()

    data = get_json_object()
    if data is None:
        return jsonify({"message": "A valid JSON request body is required."}), 400

    title = data.get("title")
    content = data.get("content")
    notice_date = data.get("date")
    category = data.get("category")

    if not all(isinstance(value, str) for value in (
        title, content, notice_date, category
    )):
        return jsonify({
            "message": "Title, content, date, and category are required."
        }), 400

    title, content = title.strip(), content.strip()
    notice_date, category = notice_date.strip(), category.strip()

    allowed_categories = {
        "Academic", "Examination", "Library", "Fees",
        "Events", "Campus", "General"
    }

    if not title or len(title) > 200:
        return jsonify({"message": "A valid notice title is required."}), 400
    if not content:
        return jsonify({"message": "Notice content is required."}), 400
    if category not in allowed_categories:
        return jsonify({"message": "Please select a valid notice category."}), 400

    try:
        datetime.strptime(notice_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"message": "Please provide a valid notice date."}), 400

    conn = get_db_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO notices (title, content, date, category) "
            "VALUES (?, ?, ?, ?)",
            (title, content, notice_date, category)
        )
        conn.commit()
        notice = conn.execute(
            "SELECT id, title, content, date, category FROM notices WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
        return jsonify({
            "message": "Notice created successfully.",
            "notice": dict(notice)
        }), 201
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to create notice.")
        return jsonify({"message": "The notice could not be created."}), 500
    finally:
        conn.close()


@app.route("/api/admin/notices/<int:notice_id>", methods=["PUT", "DELETE"])
def manage_admin_notice(notice_id):
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM notices WHERE id = ?", (notice_id,)
        ).fetchone()
        if existing is None:
            return jsonify({"message": "Notice not found."}), 404

        if request.method == "DELETE":
            conn.execute("DELETE FROM notices WHERE id = ?", (notice_id,))
            conn.commit()
            return jsonify({"message": "Notice deleted successfully.", "id": notice_id})

        data = get_json_object()
        if data is None:
            return jsonify({"message": "A valid JSON request body is required."}), 400

        title = data.get("title")
        content = data.get("content")
        notice_date = data.get("date")
        category = data.get("category")

        if not all(isinstance(value, str) for value in (
            title, content, notice_date, category
        )):
            return jsonify({"message": "All notice fields are required."}), 400

        title, content = title.strip(), content.strip()
        notice_date, category = notice_date.strip(), category.strip()
        allowed_categories = {
            "Academic", "Examination", "Library", "Fees",
            "Events", "Campus", "General"
        }

        if not title or len(title) > 200 or not content:
            return jsonify({"message": "Please provide valid notice details."}), 400
        if category not in allowed_categories:
            return jsonify({"message": "Please select a valid notice category."}), 400

        try:
            datetime.strptime(notice_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"message": "Please provide a valid notice date."}), 400

        conn.execute(
            "UPDATE notices SET title = ?, content = ?, date = ?, category = ? "
            "WHERE id = ?",
            (title, content, notice_date, category, notice_id)
        )
        conn.commit()
        updated = conn.execute(
            "SELECT id, title, content, date, category FROM notices WHERE id = ?",
            (notice_id,)
        ).fetchone()
        return jsonify({
            "message": "Notice updated successfully.",
            "notice": dict(updated)
        })
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to manage notice %s.", notice_id)
        return jsonify({"message": "The notice could not be processed."}), 500
    finally:
        conn.close()


# ============================================================
# FEATURE 4 - EVENTS
# Existing student GET API preserved.
# ============================================================

@app.route("/api/events")
def get_events():
    conn = get_db_connection()
    try:
        events = conn.execute(
            "SELECT id, title, description, date, time, location "
            "FROM events ORDER BY date ASC"
        ).fetchall()
    finally:
        conn.close()
    return jsonify([dict(event) for event in events])


@app.route("/events")
def events_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("events.html")


# ============================================================
# FEATURE 8.4 - ADMIN EVENT MANAGEMENT
# GET/POST /api/admin/events
# PUT/DELETE /api/admin/events/<id>
# ============================================================

@app.route("/admin-events")
def admin_events_page():
    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))
    return render_template(
        "admin_events.html",
        admin_name=session.get("admin_name", "Administrator")
    )


@app.route("/api/admin/events", methods=["GET", "POST"])
def admin_events_api():
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()
    try:
        if request.method == "GET":
            events = conn.execute(
                "SELECT id, title, description, date, time, location "
                "FROM events ORDER BY date ASC, id ASC"
            ).fetchall()
            return jsonify({"events": [dict(event) for event in events]})

        data = get_json_object()
        payload, error = validate_event_payload(data)
        if error:
            return jsonify({"message": error}), 400

        cursor = conn.execute(
            "INSERT INTO events (title, description, date, time, location) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                payload["title"], payload["description"], payload["date"],
                payload["time"], payload["location"]
            )
        )
        conn.commit()
        event = conn.execute(
            "SELECT id, title, description, date, time, location "
            "FROM events WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
        return jsonify({
            "message": "Event created successfully.",
            "event": dict(event)
        }), 201
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to process admin events request.")
        return jsonify({"message": "The event request could not be completed."}), 500
    finally:
        conn.close()


@app.route("/api/admin/events/<int:event_id>", methods=["PUT", "DELETE"])
def manage_admin_event(event_id):
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM events WHERE id = ?", (event_id,)
        ).fetchone()
        if existing is None:
            return jsonify({"message": "Event not found."}), 404

        if request.method == "DELETE":
            conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
            conn.commit()
            return jsonify({"message": "Event deleted successfully.", "id": event_id})

        payload, error = validate_event_payload(get_json_object())
        if error:
            return jsonify({"message": error}), 400

        conn.execute(
            "UPDATE events SET title = ?, description = ?, date = ?, "
            "time = ?, location = ? WHERE id = ?",
            (
                payload["title"], payload["description"], payload["date"],
                payload["time"], payload["location"], event_id
            )
        )
        conn.commit()
        event = conn.execute(
            "SELECT id, title, description, date, time, location "
            "FROM events WHERE id = ?",
            (event_id,)
        ).fetchone()
        return jsonify({
            "message": "Event updated successfully.",
            "event": dict(event)
        })
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to manage event %s.", event_id)
        return jsonify({"message": "The event could not be processed."}), 500
    finally:
        conn.close()


# ============================================================
# FEATURE 5 - RESOURCES
# Existing student GET API preserved; adds category to response.
# ============================================================

@app.route("/api/resources")
def get_resources():
    conn = get_db_connection()
    try:
        ensure_resource_category_column(conn)
        resources = conn.execute(
            "SELECT id, title, description, link, category "
            "FROM resources ORDER BY id ASC"
        ).fetchall()
    finally:
        conn.close()
    return jsonify([dict(resource) for resource in resources])


@app.route("/resources")
def resources_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("resources.html")


# ============================================================
# FEATURE 8.4 - ADMIN RESOURCE MANAGEMENT
# GET/POST /api/admin/resources
# PUT/DELETE /api/admin/resources/<id>
# ============================================================

@app.route("/admin-resources")
def admin_resources_page():
    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))
    return render_template(
        "admin_resources.html",
        admin_name=session.get("admin_name", "Administrator")
    )


@app.route("/api/admin/resources", methods=["GET", "POST"])
def admin_resources_api():
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()
    try:
        ensure_resource_category_column(conn)

        if request.method == "GET":
            resources = conn.execute(
                "SELECT id, title, description, link, category "
                "FROM resources ORDER BY id DESC"
            ).fetchall()
            return jsonify({"resources": [dict(resource) for resource in resources]})

        payload, error = validate_resource_payload(get_json_object())
        if error:
            return jsonify({"message": error}), 400

        cursor = conn.execute(
            "INSERT INTO resources (title, description, link, category) "
            "VALUES (?, ?, ?, ?)",
            (
                payload["title"], payload["description"],
                payload["link"], payload["category"]
            )
        )
        conn.commit()
        resource = conn.execute(
            "SELECT id, title, description, link, category "
            "FROM resources WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
        return jsonify({
            "message": "Resource created successfully.",
            "resource": dict(resource)
        }), 201
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to process admin resources request.")
        return jsonify({"message": "The resource request could not be completed."}), 500
    finally:
        conn.close()


@app.route("/api/admin/resources/<int:resource_id>", methods=["PUT", "DELETE"])
def manage_admin_resource(resource_id):
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()
    try:
        ensure_resource_category_column(conn)
        existing = conn.execute(
            "SELECT id FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
        if existing is None:
            return jsonify({"message": "Resource not found."}), 404

        if request.method == "DELETE":
            conn.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
            conn.commit()
            return jsonify({
                "message": "Resource deleted successfully.",
                "id": resource_id
            })

        payload, error = validate_resource_payload(get_json_object())
        if error:
            return jsonify({"message": error}), 400

        conn.execute(
            "UPDATE resources SET title = ?, description = ?, link = ?, "
            "category = ? WHERE id = ?",
            (
                payload["title"], payload["description"], payload["link"],
                payload["category"], resource_id
            )
        )
        conn.commit()
        resource = conn.execute(
            "SELECT id, title, description, link, category "
            "FROM resources WHERE id = ?",
            (resource_id,)
        ).fetchone()
        return jsonify({
            "message": "Resource updated successfully.",
            "resource": dict(resource)
        })
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to manage resource %s.", resource_id)
        return jsonify({"message": "The resource could not be processed."}), 500
    finally:
        conn.close()


# ============================================================
# FEATURE 6 - DISCUSSION BOARD
# ============================================================

@app.route("/api/discussions")
def get_discussions():
    conn = get_db_connection()
    try:
        discussions = conn.execute(
            """
            SELECT discussions.id, discussions.title, discussions.content,
                   discussions.created_at, users.name AS author
            FROM discussions
            JOIN users ON discussions.user_id = users.id
            ORDER BY discussions.created_at DESC
            """
        ).fetchall()
    finally:
        conn.close()
    return jsonify([dict(discussion) for discussion in discussions])


@app.route("/discussion")
def discussion_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    conn = get_db_connection()
    try:
        discussions = conn.execute(
            """
            SELECT discussions.id, discussions.title, discussions.content,
                   discussions.created_at, users.name AS author
            FROM discussions
            JOIN users ON discussions.user_id = users.id
            ORDER BY discussions.created_at DESC
            """
        ).fetchall()
    finally:
        conn.close()

    return render_template("discussion.html", discussions=discussions)


@app.route("/discussion/create", methods=["GET", "POST"])
def create_discussion_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "").strip()

        if not title or not content:
            return render_template("create_discussion.html")

        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO discussions (user_id, title, content, created_at) "
                "VALUES (?, ?, ?, ?)",
                (
                    session["user_id"], title, content,
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            conn.commit()
        finally:
            conn.close()

        return redirect(url_for("discussion_page"))

    return render_template("create_discussion.html")


@app.route("/discussion/<int:discussion_id>", methods=["GET", "POST"])
def discussion_detail(discussion_id):
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    if request.method == "POST":
        reply = request.form.get("reply", "").strip()
        if reply:
            conn = get_db_connection()
            try:
                discussion = conn.execute(
                    "SELECT id FROM discussions WHERE id = ?",
                    (discussion_id,)
                ).fetchone()

                if discussion is None:
                    return "Discussion not found", 404

                conn.execute(
                    "INSERT INTO replies "
                    "(discussion_id, user_id, content, created_at) "
                    "VALUES (?, ?, ?, ?)",
                    (
                        discussion_id, session["user_id"], reply,
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    )
                )
                conn.commit()
            finally:
                conn.close()

        return redirect(url_for("discussion_detail", discussion_id=discussion_id))

    conn = get_db_connection()
    try:
        discussion = conn.execute(
            """
            SELECT discussions.id, discussions.title, discussions.content,
                   discussions.created_at, users.name AS author
            FROM discussions
            JOIN users ON discussions.user_id = users.id
            WHERE discussions.id = ?
            """,
            (discussion_id,)
        ).fetchone()

        if discussion is None:
            return "Discussion not found", 404

        replies = conn.execute(
            """
            SELECT replies.id, replies.content, replies.created_at,
                   users.name AS author
            FROM replies
            JOIN users ON replies.user_id = users.id
            WHERE replies.discussion_id = ?
            ORDER BY replies.created_at ASC
            """,
            (discussion_id,)
        ).fetchall()
    finally:
        conn.close()

    return render_template(
        "discussion_detail.html",
        discussion=discussion,
        replies=replies
    )


# ============================================================
# FEATURE 7 - STUDENT PROFILE
# Existing student profile endpoints remain separate from admin profile.
# ============================================================

@app.route("/profile")
def profile_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("profile.html")


@app.route("/api/profile", methods=["GET"])
def get_profile():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            (session["user_id"],)
        ).fetchone()
    finally:
        conn.close()

    if user is None:
        return jsonify({"message": "Student profile not found"}), 404

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"]
    })


@app.route("/api/profile", methods=["PUT"])
def update_profile():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = get_json_object() or {}
    name = validate_person_name(data.get("name"))

    if name is None:
        return jsonify({"message": "Please enter a valid student name."}), 400

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id FROM users WHERE id = ?",
            (session["user_id"],)
        ).fetchone()

        if user is None:
            return jsonify({"message": "Student profile not found"}), 404

        conn.execute(
            "UPDATE users SET name = ? WHERE id = ?",
            (name, session["user_id"])
        )
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to update student profile.")
        return jsonify({"message": "The profile could not be updated."}), 500
    finally:
        conn.close()

    session["student_name"] = name
    return jsonify({
        "message": "Profile updated successfully",
        "name": name
    })


# ============================================================
# FEATURE 8.4 - ADMIN PROFILE
# GET/PUT /api/admin/profile
# ============================================================

@app.route("/admin-profile")
def admin_profile_page():
    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))
    return render_template(
        "admin_profile.html",
        admin_name=session.get("admin_name", "Administrator")
    )


@app.route("/api/admin/profile", methods=["GET", "PUT"])
def admin_profile_api():
    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    admin_id = session["admin_id"]
    conn = get_db_connection()

    try:
        admin = conn.execute(
            "SELECT id, name, email, role FROM users WHERE id = ?",
            (admin_id,)
        ).fetchone()

        if admin is None or admin["role"] != "admin":
            session.pop("admin_id", None)
            session.pop("admin_name", None)
            session.pop("admin_role", None)
            return jsonify({"message": "Admin profile not found."}), 404

        if request.method == "GET":
            return jsonify({
                "id": admin["id"],
                "name": admin["name"],
                "email": admin["email"]
            })

        data = get_json_object()
        if data is None:
            return jsonify({"message": "A valid JSON request body is required."}), 400

        name = validate_person_name(data.get("name"))
        email = validate_email(data.get("email"))

        if name is None:
            return jsonify({"message": "Please enter a valid administrator name."}), 400
        if email is None:
            return jsonify({"message": "Please enter a valid email address."}), 400

        duplicate = conn.execute(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            (email, admin_id)
        ).fetchone()

        if duplicate is not None:
            return jsonify({
                "message": "That email address is already in use."
            }), 409

        conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (name, email, admin_id)
        )
        conn.commit()

        session["admin_name"] = name

        return jsonify({
            "message": "Administrator profile updated successfully.",
            "id": admin_id,
            "name": name,
            "email": email
        })
    except sqlite3.Error:
        conn.rollback()
        app.logger.exception("Unable to process admin profile request.")
        return jsonify({"message": "The administrator profile could not be updated."}), 500
    finally:
        conn.close()


# ============================================================
# EXISTING STATIC FILE AND ENTRY ROUTES
# ============================================================

@app.route("/notices.js")
def notices_js():
    return send_from_directory("../frontend", "notices.js")


@app.route("/")
def home():
    return send_from_directory("../frontend", "index.html")


@app.route("/login.html")
def login_page():
    return send_from_directory("../frontend", "login.html")


@app.route("/signup.html")
def signup_page():
    return send_from_directory("../frontend", "signup.html")


@app.route("/validation.js")
def validation_js():
    return send_from_directory("../frontend", "validation.js")


if __name__ == "__main__":
    app.run(debug=True)
