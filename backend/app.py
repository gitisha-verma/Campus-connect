from flask import Flask, request, jsonify, render_template, session, send_from_directory, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime

app = Flask(
    __name__,
    static_folder="../frontend/static",
    static_url_path="/static",
    template_folder="../frontend/templates"
)

app.secret_key = "campus-connect-secret"


def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    hashed_password = generate_password_hash(password)

    conn = get_db_connection()

    conn.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        (name, email, hashed_password)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Signup request received",
        "name": name,
        "email": email
    })


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    conn = get_db_connection()

    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    conn.close()

    if user is None:
        return jsonify({"message": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    session["student_name"] = user["name"]
    session["user_id"] = user["id"]

    return jsonify({
        "message": "Login successful",
        "name": user["name"],
        "email": email
    })


# Feature 8.1 - Admin Login
@app.route("/admin-login", methods=["GET", "POST"])
def admin_login():

    if request.method == "GET":
        return render_template("admin_login.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if not username or not password:
        return jsonify({
            "message": "Email and password are required."
        }), 400

    conn = get_db_connection()

    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (username,)
    ).fetchone()

    conn.close()

    if user is None:
        return jsonify({
            "message": "Invalid admin credentials."
        }), 401

    if not check_password_hash(user["password"], password):
        return jsonify({
            "message": "Invalid admin credentials."
        }), 401

    if user["role"] != "admin":
        return jsonify({
            "message": "Access denied. Admin account required."
        }), 403

    session["admin_id"] = user["id"]
    session["admin_name"] = user["name"]
    session["admin_role"] = user["role"]

    return redirect(url_for("admin_dashboard"))


# Feature 8.2 - Admin Dashboard
@app.route("/admin-dashboard")
def admin_dashboard():

    if session.get("admin_role") != "admin":
        return redirect(url_for("admin_login"))

    conn = get_db_connection()

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


# Feature 8.2 - Admin Logout
@app.route("/admin-logout")
def admin_logout():
    session.pop("admin_id", None)
    session.pop("admin_name", None)
    session.pop("admin_role", None)

    return redirect(url_for("admin_login"))


@app.route("/dashboard-data")
def dashboard_data():
    return jsonify({
        "studentName": session.get("student_name", "Student")
    })


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    return render_template("dashboard.html")


# Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


# Feature 3 - Notices API
@app.route("/api/notices")
def get_notices():
    conn = get_db_connection()

    notices = conn.execute(
        "SELECT id, title, content, date, category FROM notices ORDER BY date DESC"
    ).fetchall()

    conn.close()

    return jsonify([dict(notice) for notice in notices])


# Feature 3 - Notices page
@app.route("/notices")
def notices_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    return render_template("notices.html")


# Feature 4 - Events API
@app.route("/api/events")
def get_events():
    conn = get_db_connection()

    events = conn.execute(
        "SELECT id, title, description, date, time, location FROM events ORDER BY date ASC"
    ).fetchall()

    conn.close()

    return jsonify([dict(event) for event in events])


# Feature 4 - Events page
@app.route("/events")
def events_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    return render_template("events.html")


# Feature 5 - Resources API
@app.route("/api/resources")
def get_resources():
    conn = get_db_connection()

    resources = conn.execute(
        "SELECT id, title, description, link FROM resources ORDER BY id ASC"
    ).fetchall()

    conn.close()

    return jsonify([dict(resource) for resource in resources])


# Feature 5 - Resources page
@app.route("/resources")
def resources_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    return render_template("resources.html")


# Feature 6 - Discussion Board API
@app.route("/api/discussions")
def get_discussions():
    conn = get_db_connection()

    discussions = conn.execute(
        """
        SELECT
            discussions.id,
            discussions.title,
            discussions.content,
            discussions.created_at,
            users.name AS author
        FROM discussions
        JOIN users ON discussions.user_id = users.id
        ORDER BY discussions.created_at DESC
        """
    ).fetchall()

    conn.close()

    return jsonify([dict(discussion) for discussion in discussions])


# Feature 6 - Discussion Board page
@app.route("/discussion")
def discussion_page():

    if "user_id" not in session:
        return redirect(url_for("login_page"))

    conn = get_db_connection()

    discussions = conn.execute(
        """
        SELECT
            discussions.id,
            discussions.title,
            discussions.content,
            discussions.created_at,
            users.name AS author
        FROM discussions
        JOIN users ON discussions.user_id = users.id
        ORDER BY discussions.created_at DESC
        """
    ).fetchall()

    conn.close()

    return render_template(
        "discussion.html",
        discussions=discussions
    )


# Feature 6 - Create Discussion page
@app.route("/discussion/create", methods=["GET", "POST"])
def create_discussion_page():

    if "user_id" not in session:
        return redirect(url_for("login_page"))

    if request.method == "POST":

        title = request.form.get("title", "").strip()
        content = request.form.get("content", "").strip()

        if title == "" or content == "":
            return render_template("create_discussion.html")

        conn = get_db_connection()

        conn.execute(
            """
            INSERT INTO discussions
            (user_id, title, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                session["user_id"],
                title,
                content,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
        )

        conn.commit()
        conn.close()

        return redirect(url_for("discussion_page"))

    return render_template("create_discussion.html")


# Feature 6 - Discussion Detail page
@app.route("/discussion/<int:discussion_id>", methods=["GET", "POST"])
def discussion_detail(discussion_id):

    # Only logged-in students can access the discussion detail page
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    if request.method == "POST":

        reply = request.form.get("reply", "").strip()

        if reply != "":
            conn = get_db_connection()

            discussion = conn.execute(
                "SELECT id FROM discussions WHERE id = ?",
                (discussion_id,)
            ).fetchone()

            if discussion is None:
                conn.close()
                return "Discussion not found", 404

            conn.execute(
                """
                INSERT INTO replies
                (discussion_id, user_id, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    discussion_id,
                    session["user_id"],
                    reply,
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                )
            )

            conn.commit()
            conn.close()

        return redirect(
            url_for(
                "discussion_detail",
                discussion_id=discussion_id
            )
        )

    conn = get_db_connection()

    discussion = conn.execute(
        """
        SELECT
            discussions.id,
            discussions.title,
            discussions.content,
            discussions.created_at,
            users.name AS author
        FROM discussions
        JOIN users ON discussions.user_id = users.id
        WHERE discussions.id = ?
        """,
        (discussion_id,)
    ).fetchone()

    if discussion is None:
        conn.close()
        return "Discussion not found", 404

    replies = conn.execute(
        """
        SELECT
            replies.id,
            replies.content,
            replies.created_at,
            users.name AS author
        FROM replies
        JOIN users ON replies.user_id = users.id
        WHERE replies.discussion_id = ?
        ORDER BY replies.created_at ASC
        """
    ).fetchall()

    conn.close()

    return render_template(
        "discussion_detail.html",
        discussion=discussion,
        replies=replies
    )


# Feature 7 - Student Profile page
@app.route("/profile")
def profile_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    return render_template("profile.html")


# Feature 7 - Student Profile API
@app.route("/api/profile", methods=["GET"])
def get_profile():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    conn = get_db_connection()

    user = conn.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        (session["user_id"],)
    ).fetchone()

    conn.close()

    if user is None:
        return jsonify({
            "message": "Student profile not found"
        }), 404

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"]
    })


# Feature 7 - Update Student Profile API
@app.route("/api/profile", methods=["PUT"])
def update_profile():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()

    if not name:
        return jsonify({
            "message": "Student name cannot be empty."
        }), 400

    if len(name) < 2:
        return jsonify({
            "message": "Please enter a valid student name."
        }), 400

    has_letter = any(character.isalpha() for character in name)

    has_invalid_characters = any(
        character.isdigit() or character in "<>"
        for character in name
    )

    if not has_letter or has_invalid_characters:
        return jsonify({
            "message": "Please enter a valid student name."
        }), 400

    conn = get_db_connection()

    user = conn.execute(
        "SELECT id FROM users WHERE id = ?",
        (session["user_id"],)
    ).fetchone()

    if user is None:
        conn.close()

        return jsonify({
            "message": "Student profile not found"
        }), 404

    conn.execute(
        "UPDATE users SET name = ? WHERE id = ?",
        (name, session["user_id"])
    )

    conn.commit()
    conn.close()

    # Keep the current session name synchronized with the database.
    session["student_name"] = name

    return jsonify({
        "message": "Profile updated successfully",
        "name": name
    })


# Feature 3 - Notices JavaScript
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