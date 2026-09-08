from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__)
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

    return jsonify({
        "message": "Login successful",
        "name": user["name"],
        "email": user["email"]
    })
@app.route("/")
def home():
    return "Campus Connect Backend is Running!"
if __name__ == "__main__":
    app.run(debug=True)