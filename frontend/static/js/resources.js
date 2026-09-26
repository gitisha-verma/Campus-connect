document.addEventListener("DOMContentLoaded", function () {
const searchInput = document.getElementById("resource-search");
const categoryFilter = document.getElementById("resource-category");
const resourcesList = document.getElementById("resources-list");
const resourceCards = document.querySelectorAll(".resource-card");

function filterResources() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value.toLowerCase();

    let visibleCount = 0;

    resourceCards.forEach(function (card) {
        const title = card.querySelector(".resource-title")?.textContent.toLowerCase() || "";
        const description = card.querySelector(".resource-description")?.textContent.toLowerCase() || "";
        const category = card.querySelector(".resource-category")?.textContent.toLowerCase() || "";
        const type = card.querySelector(".resource-details")?.textContent.toLowerCase() || "";

        const matchesSearch =
            title.includes(searchText) ||
            description.includes(searchText) ||
            category.includes(searchText) ||
            type.includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            category === selectedCategory;

        if (matchesSearch && matchesCategory) {
            card.style.display = "";
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    let noResultsMessage = document.getElementById("no-resources-message");

    if (visibleCount === 0) {
        if (!noResultsMessage) {
            noResultsMessage = document.createElement("p");
            noResultsMessage.id = "no-resources-message";
            noResultsMessage.textContent = "No resources found.";
            resourcesList.appendChild(noResultsMessage);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

searchInput.addEventListener("input", filterResources);
categoryFilter.addEventListener("change", filterResources);


});