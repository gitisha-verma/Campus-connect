
(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("create-resource-form");
        const titleInput = document.getElementById("resource-title");
        const categoryInput = document.getElementById("resource-category");
        const linkInput = document.getElementById("resource-link");
        const descriptionInput = document.getElementById("resource-description");
        const searchInput = document.getElementById("resource-search");
        const categoryFilter = document.getElementById("resource-category-filter");
        const resourceList = document.getElementById("resource-list");
        const loadingState = document.getElementById("resource-loading-state");
        const errorState = document.getElementById("resource-error-state");
        const successState = document.getElementById("resource-success-state");
        const emptyState = document.getElementById("resource-empty-state");
        const totalResources = document.getElementById("total-resources");
        const categoryCount = document.getElementById("resource-categories-count");
        const recentResources = document.getElementById("recent-resources-count");
        const formHeading = document.getElementById("resource-form-heading");
        const submitButton = document.getElementById("create-resource-button");

        // Custom delete confirmation dialog elements
        const deleteDialog = document.getElementById("delete-resource-dialog");
        const deleteDescription = document.getElementById("delete-resource-description");
        const cancelDeleteButton = document.getElementById("cancel-delete-resource");
        const confirmDeleteButton = document.getElementById("confirm-delete-resource");

        const required = [
            form, titleInput, categoryInput, linkInput, descriptionInput,
            searchInput, categoryFilter, resourceList, loadingState,
            errorState, successState, emptyState, totalResources,
            categoryCount, recentResources
        ];

        if (required.some((element) => !element)) {
            console.error("Admin resources: required HTML elements are missing.");
            return;
        }

        if (
            !deleteDialog ||
            !deleteDescription ||
            !cancelDeleteButton ||
            !confirmDeleteButton
        ) {
            console.error(
                "Admin resources: delete confirmation dialog elements are missing."
            );
            return;
        }

        const state = {
            resources: [],
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
                // Some successful responses may have no JSON body.
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

        function normalizeResource(resource) {
            return {
                id: resource.id,
                title: String(resource.title ?? ""),
                description: String(resource.description ?? ""),
                link: String(resource.link ?? resource.url ?? ""),
                category: String(resource.category ?? "")
            };
        }

        function updateSummary() {
            totalResources.textContent = String(state.resources.length);

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

        function createActionButton(label, action, className) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.className = className;
            button.addEventListener("click", action);
            return button;
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
                const badge = document.createElement("span");
                badge.className = "resource-badge";
                badge.textContent = resource.category;
                metadata.appendChild(badge);
            }

            if (resource.link) {
                const link = document.createElement("a");
                link.href = resource.link;
                link.textContent = "Open Resource";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                metadata.appendChild(link);
            }

            const actions = document.createElement("div");
            actions.className = "admin-item-actions";

            actions.append(
                createActionButton(
                    "Edit",
                    () => beginEdit(resource),
                    "admin-edit-button"
                ),
                createActionButton(
                    "Delete",
                    () => deleteResource(resource),
                    "admin-delete-button"
                )
            );

            card.append(title, description, metadata, actions);

            return card;
        }

        function renderResources() {
            const query = searchInput.value.trim().toLowerCase();
            const selectedCategory = categoryFilter.value;

            const filtered = state.resources.filter((resource) => {
                const matchesSearch =
                    resource.title.toLowerCase().includes(query) ||
                    resource.description.toLowerCase().includes(query) ||
                    resource.category.toLowerCase().includes(query);

                const matchesCategory =
                    !selectedCategory ||
                    resource.category === selectedCategory;

                return matchesSearch && matchesCategory;
            });

            resourceList.replaceChildren();

            filtered.forEach((resource) => {
                resourceList.appendChild(createResourceCard(resource));
            });

            const heading = emptyState.querySelector("h4");
            const description = emptyState.querySelector("p");

            if (heading && description) {
                if (state.resources.length === 0) {
                    heading.textContent = "No resources available";
                    description.textContent =
                        "Create a resource using the form above.";
                    emptyState.hidden = false;
                } else if (filtered.length === 0) {
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

        function updateCategoryFilter() {
            const current = categoryFilter.value;

            const categories = [
                ...new Set(
                    state.resources
                        .map((resource) => resource.category)
                        .filter(Boolean)
                )
            ].sort((a, b) => a.localeCompare(b));

            categoryFilter.replaceChildren(
                new Option("All Categories", "")
            );

            categories.forEach((category) => {
                categoryFilter.add(new Option(category, category));
            });

            if (categories.includes(current)) {
                categoryFilter.value = current;
            }
        }

        async function loadResources(showLoading = true) {
            if (showLoading) {
                loadingState.hidden = false;
            }

            hideMessage(errorState);

            try {
                const data = await request("/api/admin/resources");

                if (!Array.isArray(data.resources)) {
                    throw new Error(
                        "The admin resources API returned an unexpected response."
                    );
                }

                state.resources = data.resources.map(normalizeResource);

                updateCategoryFilter();
                renderResources();
            } catch (error) {
                console.error("Unable to load admin resources:", error);

                showMessage(
                    errorState,
                    error.message || "Resources could not be loaded."
                );
            } finally {
                loadingState.hidden = true;
            }
        }

        function beginEdit(resource) {
            state.editingId = resource.id;

            titleInput.value = resource.title;

            const categoryExists = Array.from(categoryInput.options)
                .some((option) => option.value === resource.category);

            if (resource.category && !categoryExists) {
                categoryInput.add(
                    new Option(resource.category, resource.category)
                );
            }

            categoryInput.value = resource.category;
            linkInput.value = resource.link;
            descriptionInput.value = resource.description;

            if (formHeading) {
                formHeading.textContent = "Edit Resource";
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
                formHeading.textContent = "Create Resource";
            }

            submitButton.textContent = "Create Resource";
        }

        // Open a custom confirmation dialog and return the user's choice.
        function confirmResourceDeletion(resource) {
            deleteDescription.textContent =
                `Are you sure you want to delete "${resource.title}"? ` +
                "This action cannot be undone.";

            deleteDialog.hidden = false;
            cancelDeleteButton.focus();

            return new Promise((resolve) => {
                let settled = false;

                function cleanup() {
                    cancelDeleteButton.removeEventListener(
                        "click",
                        handleCancel
                    );

                    confirmDeleteButton.removeEventListener(
                        "click",
                        handleConfirm
                    );

                    deleteDialog.removeEventListener(
                        "keydown",
                        handleKeydown
                    );
                }

                function finish(confirmed) {
                    if (settled) return;

                    settled = true;
                    cleanup();
                    deleteDialog.hidden = true;
                    resolve(confirmed);
                }

                function handleCancel() {
                    finish(false);
                }

                function handleConfirm() {
                    finish(true);
                }

                function handleKeydown(event) {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        finish(false);
                    }
                }

                cancelDeleteButton.addEventListener(
                    "click",
                    handleCancel
                );

                confirmDeleteButton.addEventListener(
                    "click",
                    handleConfirm
                );

                deleteDialog.addEventListener(
                    "keydown",
                    handleKeydown
                );
            });
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            hideMessage(errorState);
            hideMessage(successState);

            const payload = {
                title: titleInput.value.trim(),
                category: categoryInput.value.trim(),
                link: linkInput.value.trim(),
                description: descriptionInput.value.trim()
            };

            if (!payload.title) {
                showMessage(errorState, "Resource title is required.");
                titleInput.focus();
                return;
            }

            if (!payload.category) {
                showMessage(
                    errorState,
                    "Please select a resource category."
                );
                categoryInput.focus();
                return;
            }

            if (!payload.link) {
                showMessage(errorState, "Resource link is required.");
                linkInput.focus();
                return;
            }

            try {
                const parsedUrl = new URL(payload.link);

                if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                    throw new Error(
                        "Use a valid link beginning with http:// or https://."
                    );
                }
            } catch {
                showMessage(
                    errorState,
                    "Enter a valid resource URL beginning with http:// or https://."
                );
                linkInput.focus();
                return;
            }

            if (!payload.description) {
                showMessage(
                    errorState,
                    "Resource description is required."
                );
                descriptionInput.focus();
                return;
            }

            submitButton.disabled = true;

            try {
                const editing = state.editingId !== null;

                const url = editing
                    ? `/api/admin/resources/${encodeURIComponent(state.editingId)}`
                    : "/api/admin/resources";

                const data = await request(url, {
                    method: editing ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                });

                resetEditor();
                await loadResources(false);

                showMessage(
                    successState,
                    data.message ||
                    (editing
                        ? "Resource updated successfully."
                        : "Resource created successfully.")
                );
            } catch (error) {
                showMessage(
                    errorState,
                    error.message || "The resource could not be saved."
                );
            } finally {
                submitButton.disabled = false;
            }
        });

        async function deleteResource(resource) {
            const confirmed = await confirmResourceDeletion(resource);

            if (!confirmed) {
                return;
            }

            hideMessage(errorState);
            hideMessage(successState);

            try {
                const data = await request(
                    `/api/admin/resources/${encodeURIComponent(resource.id)}`,
                    { method: "DELETE" }
                );

                if (state.editingId === resource.id) {
                    resetEditor();
                }

                await loadResources(false);

                showMessage(
                    successState,
                    data.message || "Resource deleted successfully."
                );
            } catch (error) {
                showMessage(
                    errorState,
                    error.message || "The resource could not be deleted."
                );
            }
        }

        searchInput.addEventListener("input", renderResources);
        categoryFilter.addEventListener("change", renderResources);

        form.addEventListener("reset", () => {
            hideMessage(errorState);
            hideMessage(successState);
        });

        loadResources();
    });
})();
