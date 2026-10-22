(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("admin-profile-form");

        const nameInput = document.getElementById("profile-name");
        const emailInput = document.getElementById("profile-email");

        const displayName = document.getElementById("profile-display-name");
        const displayEmail = document.getElementById("profile-display-email");

        const editButton = document.getElementById("edit-profile-button");
        const cancelButton = document.getElementById(
            "cancel-profile-button"
        );
        const saveButton = document.getElementById(
            "save-profile-button"
        );

        const loadingState = document.getElementById(
            "profile-loading-state"
        );
        const errorState = document.getElementById(
            "profile-error-state"
        );
        const successState = document.getElementById(
            "profile-success-state"
        );

        const requiredElements = [
            form,
            nameInput,
            emailInput,
            displayName,
            displayEmail,
            editButton,
            cancelButton,
            saveButton,
            loadingState,
            errorState,
            successState
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin profile: required HTML elements are missing."
            );
            return;
        }

        /*
         * Expected admin profile API.
         * Gitisha can use the same endpoint while implementing
         * the backend integration.
         */
        const PROFILE_API = "/api/admin/profile";

        const state = {
            profile: {
                name: "",
                email: ""
            },
            editing: false
        };

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
        }

        function normalizeProfile(data) {
            const profile = data?.profile ?? data;

            return {
                name: String(profile?.name ?? "").trim(),
                email: String(profile?.email ?? "").trim()
            };
        }

        function updateDisplayedProfile(profile) {
            displayName.textContent = profile.name || "Not available";
            displayEmail.textContent = profile.email || "Not available";

            nameInput.value = profile.name;
            emailInput.value = profile.email;
        }

        function setEditMode(isEditing) {
            state.editing = isEditing;

            nameInput.disabled = !isEditing;
            emailInput.disabled = !isEditing;

            editButton.hidden = isEditing;
            cancelButton.hidden = !isEditing;
            saveButton.hidden = !isEditing;
        }

        function validateProfile() {
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();

            if (!name) {
                showMessage(
                    errorState,
                    "Admin name is required."
                );
                nameInput.focus();
                return false;
            }

            if (name.length < 2) {
                showMessage(
                    errorState,
                    "Admin name must contain at least 2 characters."
                );
                nameInput.focus();
                return false;
            }

            if (!email) {
                showMessage(
                    errorState,
                    "Admin email is required."
                );
                emailInput.focus();
                return false;
            }

            if (!emailInput.checkValidity()) {
                showMessage(
                    errorState,
                    "Please enter a valid email address."
                );
                emailInput.focus();
                return false;
            }

            return true;
        }

        async function loadProfile() {
            loadingState.hidden = false;
            hideMessage(errorState);
            hideMessage(successState);

            try {
                const response = await fetch(PROFILE_API, {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    },
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to load admin profile (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();
                const profile = normalizeProfile(data);

                state.profile = profile;
                updateDisplayedProfile(profile);
                setEditMode(false);
            } catch (error) {
                console.error(
                    "Unable to load admin profile:",
                    error
                );

                showMessage(
                    errorState,
                    "Admin profile could not be loaded. Please try again later."
                );
            } finally {
                loadingState.hidden = true;
            }
        }

        editButton.addEventListener("click", () => {
            hideMessage(errorState);
            hideMessage(successState);

            nameInput.value = state.profile.name;
            emailInput.value = state.profile.email;

            setEditMode(true);
            nameInput.focus();
        });

        cancelButton.addEventListener("click", () => {
            hideMessage(errorState);
            hideMessage(successState);

            nameInput.value = state.profile.name;
            emailInput.value = state.profile.email;

            setEditMode(false);
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            hideMessage(errorState);
            hideMessage(successState);

            if (!validateProfile()) {
                return;
            }

            const updatedProfile = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim()
            };

            saveButton.disabled = true;
            loadingState.hidden = false;

            try {
                const response = await fetch(PROFILE_API, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify(updatedProfile)
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to update admin profile (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();
                const profile = normalizeProfile(data);

                state.profile = {
                    name: profile.name || updatedProfile.name,
                    email: profile.email || updatedProfile.email
                };

                updateDisplayedProfile(state.profile);
                setEditMode(false);

                showMessage(
                    successState,
                    "Admin profile updated successfully."
                );
            } catch (error) {
                console.error(
                    "Unable to update admin profile:",
                    error
                );

                showMessage(
                    errorState,
                    "Admin profile could not be updated. Please try again later."
                );
            } finally {
                saveButton.disabled = false;
                loadingState.hidden = true;
            }
        });

        form.addEventListener("reset", () => {
            hideMessage(errorState);
            hideMessage(successState);

            nameInput.value = state.profile.name;
            emailInput.value = state.profile.email;

            setEditMode(false);
        });

        setEditMode(false);
        loadProfile();
    });
})();