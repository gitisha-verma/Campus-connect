document.addEventListener("DOMContentLoaded", function () {
    const editButton = document.getElementById("edit-profile-button");
    const cancelButton = document.getElementById("cancel-edit-button");
    const editSection = document.getElementById("edit-profile-section");
    const profileForm = document.getElementById("profile-form");

    const nameValue = document.getElementById("profile-name");
    const emailValue = document.getElementById("profile-email");

    const nameInput = document.getElementById("student-name");
    const emailInput = document.getElementById("student-email");

    if (
        !editButton ||
        !cancelButton ||
        !editSection ||
        !profileForm ||
        !nameValue ||
        !emailValue ||
        !nameInput ||
        !emailInput
    ) {
        return;
    }

    let savedName = "";

    // -----------------------------
    // Validation message
    // -----------------------------
    function showValidationMessage(message) {
        let messageElement = document.getElementById("profile-name-error");

        if (!messageElement) {
            messageElement = document.createElement("p");
            messageElement.id = "profile-name-error";
            messageElement.setAttribute("role", "alert");
            messageElement.style.color = "#b42318";
            messageElement.style.marginTop = "6px";

            nameInput.insertAdjacentElement("afterend", messageElement);
        }

        messageElement.textContent = message;
        nameInput.setAttribute("aria-invalid", "true");
    }

    function clearValidationMessage() {
        const messageElement =
            document.getElementById("profile-name-error");

        if (messageElement) {
            messageElement.remove();
        }

        nameInput.removeAttribute("aria-invalid");
    }

    // -----------------------------
    // Validate student name
    // -----------------------------
    function validateName(value) {
        const name = value.trim();

        if (!name) {
            return "Student name cannot be empty.";
        }

        if (name.length < 2) {
            return "Please enter a valid student name.";
        }

        const hasLetter = /[\p{L}]/u.test(name);
        const hasInvalidCharacters = /[<>0-9]/.test(name);

        if (!hasLetter || hasInvalidCharacters) {
            return "Please enter a valid student name.";
        }

        return "";
    }

    // -----------------------------
    // Load profile from Flask API
    // -----------------------------
    async function loadProfile() {
        try {
            const response = await fetch("/api/profile");

            if (response.status === 401) {
                window.location.href = "/login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load profile."
                );
            }

            savedName = data.name;

            nameValue.textContent = data.name;
            emailValue.textContent = data.email;

            nameInput.value = data.name;
            emailInput.value = data.email;

        } catch (error) {
            console.error("Profile loading error:", error);
            alert(error.message || "Unable to load your profile.");
        }
    }

    // -----------------------------
    // Open edit profile
    // -----------------------------
    editButton.addEventListener("click", function () {
        nameInput.value = savedName;

        clearValidationMessage();

        editSection.hidden = false;
        editButton.hidden = true;

        nameInput.focus();
    });

    // -----------------------------
    // Cancel editing
    // -----------------------------
    cancelButton.addEventListener("click", function () {
        nameInput.value = savedName;

        clearValidationMessage();

        editSection.hidden = true;
        editButton.hidden = false;
    });

    // -----------------------------
    // Save updated profile
    // -----------------------------
    profileForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const updatedName = nameInput.value.trim();
        const validationMessage = validateName(updatedName);

        if (validationMessage) {
            showValidationMessage(validationMessage);
            nameInput.focus();
            return;
        }

        clearValidationMessage();

        const saveButton = profileForm.querySelector(
            'button[type="submit"]'
        );

        if (saveButton) {
            saveButton.disabled = true;
        }

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: updatedName
                })
            });

            const data = await response.json();

            if (response.status === 401) {
                window.location.href = "/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update profile."
                );
            }

            // Update the displayed profile information
            savedName = data.name;
            nameValue.textContent = data.name;
            nameInput.value = data.name;

            editSection.hidden = true;
            editButton.hidden = false;

        } catch (error) {
            console.error("Profile update error:", error);

            showValidationMessage(
                error.message || "Unable to update your profile."
            );

            nameInput.focus();

        } finally {
            if (saveButton) {
                saveButton.disabled = false;
            }
        }
    });

    // -----------------------------
    // Clear validation while typing
    // -----------------------------
    nameInput.addEventListener("input", function () {
        if (nameInput.value.trim()) {
            clearValidationMessage();
        }
    });

    // -----------------------------
    // Load logged-in student's profile
    // -----------------------------
    loadProfile();
});