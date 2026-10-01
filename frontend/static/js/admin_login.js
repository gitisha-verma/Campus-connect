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

    loginForm.addEventListener("submit", function (event) {
        if (!validateForm()) {
            event.preventDefault();
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
