document.addEventListener("DOMContentLoaded", function () {
    const editButton = document.getElementById("edit-profile-button");
    const cancelButton = document.getElementById("cancel-edit-button");
    const editSection = document.getElementById("edit-profile-section");
    const profileForm = document.getElementById("profile-form");
    const nameValue = document.getElementById("profile-name");
    const nameInput = document.getElementById("student-name");

    if (!editButton || !cancelButton || !editSection ||
        !profileForm || !nameValue || !nameInput) {
        return;
    }

    let savedName = nameValue.textContent.trim();

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
        const messageElement = document.getElementById("profile-name-error");

        if (messageElement) {
            messageElement.remove();
        }

        nameInput.removeAttribute("aria-invalid");
    }

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

    editButton.addEventListener("click", function () {
        savedName = nameValue.textContent.trim();

        nameInput.value = savedName;
        clearValidationMessage();

        editSection.hidden = false;
        editButton.hidden = true;

        nameInput.focus();
    });

    cancelButton.addEventListener("click", function () {
        nameInput.value = savedName;
        clearValidationMessage();

        editSection.hidden = true;
        editButton.hidden = false;
    });

    profileForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const updatedName = nameInput.value.trim();
        const validationMessage = validateName(updatedName);

        if (validationMessage) {
            showValidationMessage(validationMessage);
            nameInput.focus();
            return;
        }

        clearValidationMessage();

        savedName = updatedName;
        nameInput.value = updatedName;
        nameValue.textContent = updatedName;

        editSection.hidden = true;
        editButton.hidden = false;
    });

    nameInput.addEventListener("input", function () {
        if (nameInput.value.trim()) {
            clearValidationMessage();
        }
    });
});

