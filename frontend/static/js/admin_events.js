
(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("create-event-form");
        const titleInput = document.getElementById("event-title");
        const dateInput = document.getElementById("event-date");
        const timeInput = document.getElementById("event-time");
        const locationInput = document.getElementById("event-location");
        const descriptionInput = document.getElementById("event-description");
        const searchInput = document.getElementById("event-search");
        const dateFilter = document.getElementById("event-date-filter");
        const eventList = document.getElementById("event-list");
        const loadingState = document.getElementById("event-loading-state");
        const errorState = document.getElementById("event-error-state");
        const successState = document.getElementById("event-success-state");
        const emptyState = document.getElementById("event-empty-state");
        const totalEvents = document.getElementById("total-events");
        const upcomingEvents = document.getElementById("upcoming-events");
        const pastEvents = document.getElementById("past-events");
        const formHeading = document.getElementById("event-form-heading");
        const submitButton = document.getElementById("create-event-button");

        const required = [
            form, titleInput, dateInput, timeInput, locationInput,
            descriptionInput, searchInput, dateFilter, eventList,
            loadingState, errorState, successState, emptyState,
            totalEvents, upcomingEvents, pastEvents
        ];

        if (required.some((element) => !element)) {
            console.error("Admin events: required HTML elements are missing.");
            return;
        }

        const state = {
            events: [],
            editingId: null
        };

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
            element.textContent = "";
        }

        async function request(url, options = {}) {
            const response = await fetch(url, {
                ...options,
                headers: {
                    Accept: "application/json",
                    ...(options.body
                        ? { "Content-Type": "application/json" }
                        : {}),
                    ...options.headers
                }
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                // The response may have no JSON body.
            }

            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "Your admin session may have expired. Please sign in again."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Request failed (HTTP ${response.status}).`
                );
            }

            return data;
        }

        function normalizeEvent(event) {
            return {
                id: event.id,
                title: String(event.title ?? ""),
                description: String(event.description ?? ""),
                date: String(event.date ?? ""),
                time: String(event.time ?? ""),
                location: String(event.location ?? "")
            };
        }

        function getEventDate(event) {
            if (!event.date) return null;

            const date = new Date(`${event.date}T00:00:00`);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        function isUpcoming(event) {
            const date = getEventDate(event);
            const today = new Date();

            today.setHours(0, 0, 0, 0);

            return date !== null && date >= today;
        }

        function updateSummary() {
            totalEvents.textContent = String(state.events.length);

            const upcoming = state.events.filter(isUpcoming).length;

            upcomingEvents.textContent = String(upcoming);
            pastEvents.textContent = String(state.events.length - upcoming);
        }

        function createActionButton(label, action, className) {
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = label;
            button.className = className;
            button.addEventListener("click", action);

            return button;
        }

        function createEventCard(event) {
            const card = document.createElement("article");
            card.className = "event-item";

            const title = document.createElement("h4");
            title.textContent = event.title;

            const description = document.createElement("p");
            description.textContent = event.description;

            const metadata = document.createElement("div");
            metadata.className = "event-meta";

            const date = document.createElement("span");
            date.textContent = event.date || "No date";
            metadata.appendChild(date);

            if (event.time) {
                const time = document.createElement("span");
                time.textContent = event.time;
                metadata.appendChild(time);
            }

            if (event.location) {
                const location = document.createElement("span");
                location.textContent = event.location;
                metadata.appendChild(location);
            }

            const actions = document.createElement("div");
            actions.className = "admin-item-actions";

            actions.append(
                createActionButton(
                    "Edit",
                    () => beginEdit(event),
                    "admin-edit-button"
                ),
                createActionButton(
                    "Delete",
                    () => deleteEvent(event),
                    "admin-delete-button"
                )
            );

            card.append(title, description, metadata, actions);

            return card;
        }

        function renderEvents() {
            const query = searchInput.value.trim().toLowerCase();
            const filter = dateFilter.value;

            const filtered = state.events.filter((event) => {
                const matchesSearch = [
                    event.title,
                    event.description,
                    event.location
                ].some((value) => value.toLowerCase().includes(query));

                const matchesDate =
                    filter === "upcoming" ? isUpcoming(event) :
                    filter === "past"
                        ? getEventDate(event) !== null && !isUpcoming(event)
                        : true;

                return matchesSearch && matchesDate;
            });

            eventList.replaceChildren();

            filtered.forEach((event) => {
                eventList.appendChild(createEventCard(event));
            });

            const heading = emptyState.querySelector("h4");
            const emptyDescription = emptyState.querySelector("p");

            if (heading && emptyDescription) {
                if (state.events.length === 0) {
                    heading.textContent = "No events available";
                    emptyDescription.textContent =
                        "Create an event using the form above.";
                    emptyState.hidden = false;
                } else if (filtered.length === 0) {
                    heading.textContent = "No matching events";
                    emptyDescription.textContent =
                        "Try changing your search or date filter.";
                    emptyState.hidden = false;
                } else {
                    emptyState.hidden = true;
                }
            }

            updateSummary();
        }

        async function loadEvents(showLoading = true) {
            if (showLoading) {
                loadingState.hidden = false;
            }

            hideMessage(errorState);

            try {
                const data = await request("/api/admin/events");

                if (!Array.isArray(data.events)) {
                    throw new Error(
                        "The admin events API returned an unexpected response."
                    );
                }

                state.events = data.events.map(normalizeEvent);
                renderEvents();
            } catch (error) {
                console.error("Unable to load admin events:", error);

                showMessage(
                    errorState,
                    error.message || "Events could not be loaded."
                );
            } finally {
                loadingState.hidden = true;
            }
        }

        function beginEdit(event) {
            state.editingId = event.id;

            titleInput.value = event.title;
            dateInput.value = event.date;
            timeInput.value = event.time;
            locationInput.value = event.location;
            descriptionInput.value = event.description;

            if (formHeading) {
                formHeading.textContent = "Edit Event";
            }

            submitButton.textContent = "Save Changes";

            hideMessage(errorState);
            hideMessage(successState);

            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            titleInput.focus();
        }

        function resetEditor() {
            state.editingId = null;
            form.reset();

            if (formHeading) {
                formHeading.textContent = "Create Event";
            }

            submitButton.textContent = "Create Event";
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            hideMessage(errorState);
            hideMessage(successState);

            const payload = {
                title: titleInput.value.trim(),
                date: dateInput.value,
                time: timeInput.value.trim(),
                location: locationInput.value.trim(),
                description: descriptionInput.value.trim()
            };

            if (!payload.title) {
                showMessage(errorState, "Event title is required.");
                titleInput.focus();
                return;
            }

            if (!payload.date) {
                showMessage(errorState, "Event date is required.");
                dateInput.focus();
                return;
            }

            if (!payload.description) {
                showMessage(errorState, "Event description is required.");
                descriptionInput.focus();
                return;
            }

            submitButton.disabled = true;

            try {
                const editing = state.editingId !== null;

                const url = editing
                    ? `/api/admin/events/${encodeURIComponent(state.editingId)}`
                    : "/api/admin/events";

                const data = await request(url, {
                    method: editing ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                });

                resetEditor();

                await loadEvents(false);

                showMessage(
                    successState,
                    data.message ||
                    (editing
                        ? "Event updated successfully."
                        : "Event created successfully.")
                );
            } catch (error) {
                showMessage(
                    errorState,
                    error.message || "The event could not be saved."
                );
            } finally {
                submitButton.disabled = false;
            }
        });

        // Custom event deletion confirmation dialog.
        async function deleteEvent(event) {
            const dialog = document.getElementById("delete-event-dialog");
            const cancelButton = document.getElementById("cancel-delete-event");
            const confirmButton = document.getElementById("confirm-delete-event");
            const dialogDescription = document.getElementById(
                "delete-event-description"
            );

            if (
                !dialog ||
                !cancelButton ||
                !confirmButton ||
                !dialogDescription
            ) {
                console.error(
                    "Admin events: deletion confirmation dialog is missing."
                );

                showMessage(
                    errorState,
                    "The confirmation dialog could not be opened. Please refresh the page."
                );

                return;
            }

            hideMessage(errorState);
            hideMessage(successState);

            dialogDescription.textContent =
                `Are you sure you want to delete "${event.title}"? This action cannot be undone.`;

            dialog.hidden = false;
            cancelButton.focus();

            const confirmed = await new Promise((resolve) => {
                let finished = false;

                const cleanup = () => {
                    confirmButton.removeEventListener("click", onConfirm);
                    cancelButton.removeEventListener("click", onCancel);
                    dialog.removeEventListener("keydown", onKeydown);
                };

                const finish = (result) => {
                    if (finished) return;

                    finished = true;
                    cleanup();
                    dialog.hidden = true;
                    resolve(result);
                };

                const onConfirm = () => finish(true);
                const onCancel = () => finish(false);

                const onKeydown = (e) => {
                    if (e.key === "Escape") {
                        finish(false);
                    }
                };

                confirmButton.addEventListener("click", onConfirm);
                cancelButton.addEventListener("click", onCancel);
                dialog.addEventListener("keydown", onKeydown);
            });

            if (!confirmed) return;

            try {
                const data = await request(
                    `/api/admin/events/${encodeURIComponent(event.id)}`,
                    {
                        method: "DELETE"
                    }
                );

                if (String(state.editingId) === String(event.id)) {
                    resetEditor();
                }

                await loadEvents(false);

                showMessage(
                    successState,
                    data.message || "Event deleted successfully."
                );
            } catch (error) {
                showMessage(
                    errorState,
                    error.message || "The event could not be deleted."
                );
            }
        }

        searchInput.addEventListener("input", renderEvents);
        dateFilter.addEventListener("change", renderEvents);

        form.addEventListener("reset", () => {
            hideMessage(errorState);
            hideMessage(successState);
        });

        loadEvents();
    });
})();
