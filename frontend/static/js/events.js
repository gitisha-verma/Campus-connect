const searchInput = document.getElementById("event-search");
const categoryFilter = document.getElementById("event-category");
const dateFilter = document.getElementById("event-date");
const eventsList = document.querySelector(".events-list");

let eventCards = [];
let noEventsMessage = null;

async function loadEvents() {
    try {
        const response = await fetch("/api/events");

        if (!response.ok) {
            throw new Error("Failed to load events");
        }

        const events = await response.json();

        eventsList.innerHTML = "";

        events.forEach(function (event) {
            const card = document.createElement("article");
            card.className = "event-card";

            const category = getCategory(event.title);

            card.innerHTML = `
                <span class="event-category">${category}</span>

                <h3>${event.title}</h3>

                <p class="event-description">
                    ${event.description}
                </p>

                <div class="event-details">
                    <p><strong>Date:</strong> ${formatDate(event.date)}</p>
                    <p><strong>Time:</strong> ${event.time}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                </div>
            `;

            eventsList.appendChild(card);
        });

        eventCards = document.querySelectorAll(".event-card");

        filterEvents();

    } catch (error) {
        console.error("Error loading events:", error);
    }
}


function getCategory(title) {
    const lowerTitle = title.toLowerCase();

    if (
        lowerTitle.includes("cricket") ||
        lowerTitle.includes("sports") ||
        lowerTitle.includes("tournament")
    ) {
        return "Sports";
    }

    if (
        lowerTitle.includes("cultural") ||
        lowerTitle.includes("music") ||
        lowerTitle.includes("dance")
    ) {
        return "Cultural";
    }

    if (
        lowerTitle.includes("workshop") ||
        lowerTitle.includes("technology") ||
        lowerTitle.includes("coding")
    ) {
        return "Workshop";
    }

    return "Academic";
}


function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


function filterEvents() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedDate = dateFilter.value;

    let visibleCount = 0;

    eventCards.forEach(function (card) {
        const title = card.querySelector("h3").textContent.toLowerCase();
        const description = card.querySelector(".event-description").textContent.toLowerCase();
        const location = card.querySelector(".event-details").textContent.toLowerCase();
        const category = card.querySelector(".event-category").textContent.toLowerCase();

        const matchesSearch =
            title.includes(searchText) ||
            description.includes(searchText) ||
            location.includes(searchText) ||
            category.includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            category === selectedCategory;

        const matchesDate = matchesDateFilter(card, selectedDate);

        if (matchesSearch && matchesCategory && matchesDate) {
            card.style.display = "";
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    if (visibleCount === 0) {
        if (!noEventsMessage) {
            noEventsMessage = document.createElement("p");
            noEventsMessage.id = "no-events-message";
            noEventsMessage.textContent = "No events found.";
            eventsList.appendChild(noEventsMessage);
        }
    } else if (noEventsMessage) {
        noEventsMessage.remove();
        noEventsMessage = null;
    }
}


searchInput.addEventListener("input", filterEvents);
categoryFilter.addEventListener("change", filterEvents);
dateFilter.addEventListener("change", filterEvents);


function matchesDateFilter(card, selectedDate) {
    if (selectedDate === "all") {
        return true;
    }

    const dateText = card.querySelector(".event-details p").textContent;
    const eventDateText = dateText.replace("Date:", "").trim();

    const eventDate = new Date(eventDateText);
    const today = new Date();

    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (selectedDate === "today") {
        return eventDate.getTime() === today.getTime();
    }

    if (selectedDate === "week") {
        const weekStart = new Date(today);
        const weekEnd = new Date(today);

        const day = today.getDay();

        weekStart.setDate(today.getDate() - day);
        weekEnd.setDate(today.getDate() + (6 - day));

        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        return eventDate >= weekStart && eventDate <= weekEnd;
    }

    if (selectedDate === "month") {
        return (
            eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear()
        );
    }

    return true;
}


loadEvents();