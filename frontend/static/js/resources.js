document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("resource-search");
    const resourcesList = document.getElementById("resources-list");

    let resources = [];

    async function loadResources() {
        try {
            const response = await fetch("/api/resources");

            if (!response.ok) {
                throw new Error("Failed to load resources");
            }

            resources = await response.json();

            displayResources(resources);
        } catch (error) {
            console.error("Error loading resources:", error);
            resourcesList.innerHTML = "<p>Unable to load resources.</p>";
        }
    }

    function displayResources(resourceData) {
        resourcesList.innerHTML = "";

        if (resourceData.length === 0) {
            resourcesList.innerHTML =
                '<p id="no-resources-message">No resources found.</p>';
            return;
        }

        resourceData.forEach(function (resource) {
            const card = document.createElement("article");
            card.className = "resource-card";

            card.innerHTML = `
                <span class="resource-category">Resource</span>

                <h3 class="resource-title">
                    ${resource.title}
                </h3>

                <p class="resource-description">
                    ${resource.description || "No description available."}
                </p>

                <div class="resource-details">
                    <p>
                        <strong>Resource Link:</strong> Available
                    </p>
                </div>

                <a
                    href="${resource.link}"
                    class="view-resource"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Resource
                </a>
            `;

            resourcesList.appendChild(card);
        });
    }

    function filterResources() {
        const searchText = searchInput.value.trim().toLowerCase();

        const filteredResources = resources.filter(function (resource) {
            const title = resource.title?.toLowerCase() || "";
            const description = resource.description?.toLowerCase() || "";
            const link = resource.link?.toLowerCase() || "";

            return (
                title.includes(searchText) ||
                description.includes(searchText) ||
                link.includes(searchText)
            );
        });

        displayResources(filteredResources);
    }

    searchInput.addEventListener("input", filterResources);

    loadResources();
});