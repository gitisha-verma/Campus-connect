from flask import Flask, request, jsonify, render_template, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

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
    return render_template("dashboard.html")


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
    return render_template("notices.html")


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