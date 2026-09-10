const signupForm = document.getElementById("signupForm");

if (signupForm) {
    const signupName = document.getElementById("signupName");
    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const signupError = document.getElementById("signupError");

    signupForm.addEventListener("submit", function (event) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        signupError.textContent = "";

        if (signupName.value.trim() === "") {
            event.preventDefault();
            signupError.textContent = "Please enter your name.";
        } else if (signupEmail.value.trim() === "") {
            event.preventDefault();
            signupError.textContent = "Please enter your email.";
        } else if (!emailPattern.test(signupEmail.value.trim())) {
            event.preventDefault();
            signupError.textContent = "Please enter a valid email address.";
        } else if (signupPassword.value === "") {
            event.preventDefault();
            signupError.textContent = "Please enter a password.";
        } else if (confirmPassword.value === "") {
            event.preventDefault();
            signupError.textContent = "Please confirm your password.";
        } else if (signupPassword.value !== confirmPassword.value) {
            event.preventDefault();
            signupError.textContent = "Passwords do not match.";
        }
    });

    const signupInputs = [
        signupName,
        signupEmail,
        signupPassword,
        confirmPassword
    ];

    signupInputs.forEach(function (input) {
        input.addEventListener("input", function () {
            signupError.textContent = "";
        });
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginError = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (event) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        loginError.textContent = "";

        if (loginEmail.value.trim() === "") {
            event.preventDefault();
            loginError.textContent = "Please enter your email.";
        } else if (!emailPattern.test(loginEmail.value.trim())) {
            event.preventDefault();
            loginError.textContent = "Please enter a valid email address.";
        } else if (loginPassword.value === "") {
            event.preventDefault();
            loginError.textContent = "Please enter your password.";
        }
    });

    const loginInputs = [loginEmail, loginPassword];

    loginInputs.forEach(function (input) {
        input.addEventListener("input", function () {
            loginError.textContent = "";
        });
    });
}