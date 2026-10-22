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

        const requiredElements = [
            form,
            titleInput,
            dateInput,
            timeInput,
            locationInput,
            descriptionInput,
            searchInput,
            dateFilter,
            eventList,
            loadingState,
            errorState,
            successState,
            emptyState,
            totalEvents,
            upcomingEvents,
            pastEvents
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin events: required HTML elements are missing."
            );
            return;
        }

        const state = {
            events: []
        };

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
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
            if (!event.date) {
                return null;
            }

            const date = new Date(`${event.date}T00:00:00`);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        function isUpcoming(event) {
            const eventDate = getEventDate(event);

            if (!eventDate) {
                return false;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            return eventDate >= today;
        }

        function updateSummary() {
            totalEvents.textContent = String(state.events.length);

            const upcomingCount = state.events.filter(isUpcoming).length;

            upcomingEvents.textContent = String(upcomingCount);
            pastEvents.textContent = String(
                state.events.length - upcomingCount
            );
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

            metadata.prepend(date);

            card.append(title, description, metadata);

            return card;
        }

        function renderEvents() {
            const query = searchInput.value.trim().toLowerCase();
            const selectedFilter = dateFilter.value;

            const filteredEvents = state.events.filter((event) => {
                const matchesSearch =
                    event.title.toLowerCase().includes(query) ||
                    event.description.toLowerCase().includes(query) ||
                    event.location.toLowerCase().includes(query);

                let matchesDateFilter = true;

                if (selectedFilter === "upcoming") {
                    matchesDateFilter = isUpcoming(event);
                }

                if (selectedFilter === "past") {
                    matchesDateFilter =
                        getEventDate(event) !== null &&
                        !isUpcoming(event);
                }

                return matchesSearch && matchesDateFilter;
            });

            eventList.replaceChildren();

            filteredEvents.forEach((event) => {
                eventList.appendChild(createEventCard(event));
            });

            const heading = emptyState.querySelector("h4");
            const description = emptyState.querySelector("p");

            if (heading && description) {
                if (state.events.length === 0) {
                    heading.textContent = "No events available";
                    description.textContent =
                        "Events will appear here when they are available.";
                    emptyState.hidden = false;
                } else if (filteredEvents.length === 0) {
                    heading.textContent = "No matching events";
                    description.textContent =
                        "Try changing your search or date filter.";
                    emptyState.hidden = false;
                } else {
                    emptyState.hidden = true;
                }
            }

            updateSummary();
        }

        async function loadEvents() {
            loadingState.hidden = false;
            hideMessage(errorState);
            hideMessage(successState);
            emptyState.hidden = true;
            eventList.replaceChildren();

            try {
                const response = await fetch("/api/events", {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to load events (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error(
                        "The events API returned an unexpected response."
                    );
                }

                state.events = data.map(normalizeEvent);

                renderEvents();
            } catch (error) {
                console.error("Unable to load events:", error);

                showMessage(
                    errorState,
                    "Events could not be loaded. Please try again later."
                );

                emptyState.hidden = true;
                eventList.replaceChildren();
            } finally {
                loadingState.hidden = true;
            }
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            hideMessage(errorState);
            hideMessage(successState);

            const title = titleInput.value.trim();
            const date = dateInput.value;
            const description = descriptionInput.value.trim();

            if (!title) {
                showMessage(errorState, "Event title is required.");
                titleInput.focus();
                return;
            }

            if (!date) {
                showMessage(errorState, "Event date is required.");
                dateInput.focus();
                return;
            }

            if (!description) {
                showMessage(errorState, "Event description is required.");
                descriptionInput.focus();
                return;
            }

            showMessage(
                successState,
                "Event details are valid. Event creation will be connected when the admin event API is available."
            );
        });

        searchInput.addEventListener("input", renderEvents);
        dateFilter.addEventListener("change", renderEvents);

        form.addEventListener("reset", () => {
            hideMessage(errorState);
            hideMessage(successState);
        });

        loadEvents();
    });
})();