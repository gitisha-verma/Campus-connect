(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("create-resource-form");
        const titleInput = document.getElementById("resource-title");
        const categoryInput = document.getElementById("resource-category");
        const linkInput = document.getElementById("resource-link");
        const descriptionInput =
            document.getElementById("resource-description");

        const searchInput = document.getElementById("resource-search");
        const categoryFilter =
            document.getElementById("resource-category-filter");
        const resourceList = document.getElementById("resource-list");

        const loadingState =
            document.getElementById("resource-loading-state");
        const errorState =
            document.getElementById("resource-error-state");
        const successState =
            document.getElementById("resource-success-state");
        const emptyState =
            document.getElementById("resource-empty-state");

        const totalResources =
            document.getElementById("total-resources");
        const categoryCount =
            document.getElementById("resource-categories-count");
        const recentResources =
            document.getElementById("recent-resources-count");

        const requiredElements = [
            form,
            titleInput,
            categoryInput,
            linkInput,
            descriptionInput,
            searchInput,
            categoryFilter,
            resourceList,
            loadingState,
            errorState,
            successState,
            emptyState,
            totalResources,
            categoryCount,
            recentResources
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin resources: required HTML elements are missing."
            );
            return;
        }

        const state = {
            resources: []
        };

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
        }

        function normalizeResource(resource) {
            return {
                id: resource.id,
                title: String(resource.title ?? ""),
                description: String(resource.description ?? ""),
                link: String(
                    resource.link ?? resource.url ?? ""
                ),

                // The current backend does not return category.
                category: String(resource.category ?? "")
            };
        }

        function updateSummary() {
            totalResources.textContent = String(
                state.resources.length
            );

            const categories = new Set(
                state.resources
                    .map((resource) => resource.category)
                    .filter(Boolean)
            );

            categoryCount.textContent = String(categories.size);

            recentResources.textContent = String(
                Math.min(state.resources.length, 5)
            );
        }

        function createResourceCard(resource) {
            const card = document.createElement("article");
            card.className = "resource-item";

            const title = document.createElement("h4");
            title.textContent = resource.title;

            const description = document.createElement("p");
            description.textContent = resource.description;

            const metadata = document.createElement("div");
            metadata.className = "resource-meta";

            if (resource.category) {
                const category = document.createElement("span");
                category.className = "resource-badge";
                category.textContent = resource.category;
                metadata.appendChild(category);
            }

            if (resource.link) {
                const link = document.createElement("a");

                link.href = resource.link;
                link.textContent = "Open Resource";
                link.target = "_blank";
                link.rel = "noopener noreferrer";

                metadata.appendChild(link);
            }

            card.append(title, description, metadata);

            return card;
        }

        function renderResources() {
            const query = searchInput.value.trim().toLowerCase();
            const selectedCategory = categoryFilter.value;

            const filteredResources = state.resources.filter(
                (resource) => {
                    const matchesSearch =
                        resource.title
                            .toLowerCase()
                            .includes(query) ||
                        resource.description
                            .toLowerCase()
                            .includes(query);

                    const matchesCategory =
                        !selectedCategory ||
                        resource.category === selectedCategory;

                    return matchesSearch && matchesCategory;
                }
            );

            resourceList.replaceChildren();

            filteredResources.forEach((resource) => {
                resourceList.appendChild(
                    createResourceCard(resource)
                );
            });

            const heading = emptyState.querySelector("h4");
            const description = emptyState.querySelector("p");

            if (heading && description) {
                if (state.resources.length === 0) {
                    heading.textContent = "No resources available";
                    description.textContent =
                        "Resources will appear here when they are available.";
                    emptyState.hidden = false;
                } else if (filteredResources.length === 0) {
                    heading.textContent = "No matching resources";
                    description.textContent =
                        "Try changing your search or category filter.";
                    emptyState.hidden = false;
                } else {
                    emptyState.hidden = true;
                }
            }

            updateSummary();
        }

        async function loadResources() {
            loadingState.hidden = false;
            hideMessage(errorState);
            hideMessage(successState);
            emptyState.hidden = true;
            resourceList.replaceChildren();

            try {
                const response = await fetch("/api/resources", {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to load resources (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error(
                        "The resources API returned an unexpected response."
                    );
                }

                state.resources = data.map(normalizeResource);

                renderResources();
            } catch (error) {
                console.error(
                    "Unable to load resources:",
                    error
                );

                showMessage(
                    errorState,
                    "Resources could not be loaded. Please try again later."
                );

                emptyState.hidden = true;
                resourceList.replaceChildren();
            } finally {
                loadingState.hidden = true;
            }
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            hideMessage(errorState);
            hideMessage(successState);

            const title = titleInput.value.trim();
            const category = categoryInput.value;
            const link = linkInput.value.trim();
            const description = descriptionInput.value.trim();

            if (!title) {
                showMessage(
                    errorState,
                    "Resource title is required."
                );
                titleInput.focus();
                return;
            }

            if (!category) {
                showMessage(
                    errorState,
                    "Please select a resource category."
                );
                categoryInput.focus();
                return;
            }

            if (!link) {
                showMessage(
                    errorState,
                    "Resource link is required."
                );
                linkInput.focus();
                return;
            }

            if (!description) {
                showMessage(
                    errorState,
                    "Resource description is required."
                );
                descriptionInput.focus();
                return;
            }

            showMessage(
                successState,
                "Resource details are valid. Resource creation will be connected when the admin resource API is available."
            );
        });

        searchInput.addEventListener(
            "input",
            renderResources
        );

        categoryFilter.addEventListener(
            "change",
            renderResources
        );

        form.addEventListener("reset", () => {
            hideMessage(errorState);
            hideMessage(successState);
        });

        loadResources();
    });
})();