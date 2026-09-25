const searchInput = document.getElementById("event-search");
const categoryFilter = document.getElementById("event-category");
const dateFilter = document.getElementById("event-date");
const eventCards = document.querySelectorAll(".event-card");
function filterEvents() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedDate = dateFilter.value;

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

        card.style.display =
            matchesSearch && matchesCategory && matchesDate ? "" : "none";
    });
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