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


def is_admin_authenticated():
    """
    Check whether the current session belongs to an authenticated admin.
    """
    return (
        session.get("admin_id") is not None
        and session.get("admin_role") == "admin"
    )


def admin_api_unauthorized_response():
    """
    Return a JSON authorization error for admin API requests.
    """
    return jsonify({
        "message": "Unauthorized. Admin access is required."
    }), 401


# ============================================================
# FEATURE 1 - STUDENT SIGNUP
# ============================================================


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
@app.route("/admin-notices")
def admin_notices_page():

    if not is_admin_authenticated():
        return redirect(url_for("admin_login"))

    return render_template(
        "admin_notices.html",
        admin_name=session.get("admin_name", "Administrator")
    )


# ============================================================
# FEATURE 8.3 - ADMIN NOTICES API
# GET: RETRIEVE ALL NOTICES FOR ADMIN MANAGEMENT
# POST: CREATE A NOTICE
# ============================================================

@app.route("/api/admin/notices", methods=["GET", "POST"])
def admin_notices_api():

    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    # --------------------------------------------------------
    # GET - Retrieve notices for the management interface
    # --------------------------------------------------------

    if request.method == "GET":
        conn = get_db_connection()

        try:
            notices = conn.execute(
                """
                SELECT id, title, content, date, category
                FROM notices
                ORDER BY date DESC, id DESC
                """
            ).fetchall()

            return jsonify({
                "notices": [dict(notice) for notice in notices]
            })

        finally:
            conn.close()

    # --------------------------------------------------------
    # POST - Create a new notice
    # --------------------------------------------------------

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "A valid JSON request body is required."
        }), 400

    title = data.get("title")
    content = data.get("content")
    notice_date = data.get("date")
    category = data.get("category")

    if not all(
        isinstance(value, str)
        for value in (title, content, notice_date, category)
    ):
        return jsonify({
            "message": "Title, content, date, and category are required."
        }), 400

    title = title.strip()
    content = content.strip()
    notice_date = notice_date.strip()
    category = category.strip()

    allowed_categories = {
        "Academic",
        "Examination",
        "Library",
        "Fees",
        "Events",
        "Campus",
        "General"
    }

    if not title:
        return jsonify({
            "message": "Notice title is required."
        }), 400

    if len(title) > 200:
        return jsonify({
            "message": "Notice title cannot exceed 200 characters."
        }), 400

    if not content:
        return jsonify({
            "message": "Notice content is required."
        }), 400

    if category not in allowed_categories:
        return jsonify({
            "message": "Please select a valid notice category."
        }), 400

    try:
        datetime.strptime(notice_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({
            "message": "Please provide a valid notice date."
        }), 400

    conn = get_db_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO notices (title, content, date, category)
            VALUES (?, ?, ?, ?)
            """,
            (title, content, notice_date, category)
        )

        conn.commit()

        notice_id = cursor.lastrowid

        created_notice = conn.execute(
            """
            SELECT id, title, content, date, category
            FROM notices
            WHERE id = ?
            """,
            (notice_id,)
        ).fetchone()

        return jsonify({
            "message": "Notice created successfully.",
            "notice": dict(created_notice)
        }), 201

    except sqlite3.Error:
        conn.rollback()

        app.logger.exception("Unable to create notice.")

        return jsonify({
            "message": "The notice could not be created. Please try again."
        }), 500

    finally:
        conn.close()


# ============================================================
# FEATURE 8.3 - UPDATE OR DELETE A NOTICE
# PUT: UPDATE AN EXISTING NOTICE
# DELETE: REMOVE AN EXISTING NOTICE
# ============================================================

@app.route(
    "/api/admin/notices/<int:notice_id>",
    methods=["PUT", "DELETE"]
)
def manage_admin_notice(notice_id):

    if not is_admin_authenticated():
        return admin_api_unauthorized_response()

    conn = get_db_connection()

    try:
        existing_notice = conn.execute(
            """
            SELECT id, title, content, date, category
            FROM notices
            WHERE id = ?
            """,
            (notice_id,)
        ).fetchone()

        if existing_notice is None:
            return jsonify({
                "message": "Notice not found."
            }), 404

        # ----------------------------------------------------
        # DELETE - Remove an existing notice
        # ----------------------------------------------------

        if request.method == "DELETE":
            conn.execute(
                "DELETE FROM notices WHERE id = ?",
                (notice_id,)
            )

            conn.commit()

            return jsonify({
                "message": "Notice deleted successfully.",
                "id": notice_id
            })

        # ----------------------------------------------------
        # PUT - Update an existing notice
        # ----------------------------------------------------

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "message": "A valid JSON request body is required."
            }), 400

        title = data.get("title")
        content = data.get("content")
        notice_date = data.get("date")
        category = data.get("category")

        if not all(
            isinstance(value, str)
            for value in (title, content, notice_date, category)
        ):
            return jsonify({
                "message": "Title, content, date, and category are required."
            }), 400

        title = title.strip()
        content = content.strip()
        notice_date = notice_date.strip()
        category = category.strip()

        allowed_categories = {
            "Academic",
            "Examination",
            "Library",
            "Fees",
            "Events",
            "Campus",
            "General"
        }

        if not title:
            return jsonify({
                "message": "Notice title is required."
            }), 400

        if len(title) > 200:
            return jsonify({
                "message": "Notice title cannot exceed 200 characters."
            }), 400

        if not content:
            return jsonify({
                "message": "Notice content is required."
            }), 400

        if category not in allowed_categories:
            return jsonify({
                "message": "Please select a valid notice category."
            }), 400

        try:
            datetime.strptime(notice_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({
                "message": "Please provide a valid notice date."
            }), 400

        conn.execute(
            """
            UPDATE notices
            SET title = ?, content = ?, date = ?, category = ?
            WHERE id = ?
            """,
            (title, content, notice_date, category, notice_id)
        )

        conn.commit()

        updated_notice = conn.execute(
            """
            SELECT id, title, content, date, category
            FROM notices
            WHERE id = ?
            """,
            (notice_id,)
        ).fetchone()

        return jsonify({
            "message": "Notice updated successfully.",
            "notice": dict(updated_notice)
        })

    except sqlite3.Error:
        conn.rollback()

        app.logger.exception(
            "Unable to manage notice with ID %s.",
            notice_id
        )

        return jsonify({
            "message": "The notice could not be processed. Please try again."
        }), 500

    finally:
        conn.close()


# ============================================================
# FEATURE 4 - EVENTS API
# ============================================================


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
