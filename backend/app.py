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
        """,
        (discussion_id,)
    ).fetchall()

    conn.close()

    return render_template(
        "discussion_detail.html",
        discussion=discussion,
        replies=replies
    )


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