document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.querySelector(".admin-login-form");
    const usernameInput = document.getElementById("admin-username");
    const passwordInput = document.getElementById("admin-password");
    const messageArea = document.getElementById("admin-login-message");

    if (!loginForm || !usernameInput || !passwordInput || !messageArea) {
        return;
    }

    function setFieldError(field, message) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", "admin-login-message");
        messageArea.textContent = message;
    }

    function clearFieldError(field) {
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
    }

    function validateForm() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        clearFieldError(usernameInput);
        clearFieldError(passwordInput);
        messageArea.textContent = "";

        if (!username) {
            setFieldError(
                usernameInput,
                "Please enter your email or username."
            );
            usernameInput.focus();
            return false;
        }

        if (!password) {
            setFieldError(
                passwordInput,
                "Please enter your password."
            );
            passwordInput.focus();
            return false;
        }

        return true;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(loginForm);

        try {
            const response = await fetch(loginForm.action, {
                method: "POST",
                body: formData
            });

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                messageArea.textContent = data.message || "Login failed.";
                return;
            }

            if (data.message) {
                messageArea.textContent = data.message;
            }

        } catch (error) {
            messageArea.textContent =
                "Unable to connect to the server. Please try again.";
        }
    });

    usernameInput.addEventListener("input", function () {
        if (usernameInput.value.trim()) {
            clearFieldError(usernameInput);

            if (passwordInput.value.trim()) {
                messageArea.textContent = "";
            }
        }
    });

    passwordInput.addEventListener("input", function () {
        if (passwordInput.value.trim()) {
            clearFieldError(passwordInput);

            if (usernameInput.value.trim()) {
                messageArea.textContent = "";
            }
        }
    });
});