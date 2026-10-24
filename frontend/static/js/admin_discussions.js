
(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        // ==========================================
        // 1. DOM ELEMENTS
        // ==========================================

        const searchInput =
            document.getElementById("discussion-search");

        const sortSelect =
            document.getElementById("discussion-sort");

        const clearFiltersButton =
            document.getElementById("clear-discussion-filters");

        const loadingState =
            document.getElementById("admin-discussions-loading-state");

        const errorState =
            document.getElementById("admin-discussions-error-state");

        const successState =
            document.getElementById("admin-discussions-success-state");

        const successMessage =
            document.getElementById("discussion-success-message");

        const emptyState =
            document.getElementById("admin-discussions-empty-state");

        const discussionList =
            document.getElementById("admin-discussions-list");

        const retryButton =
            document.getElementById("retry-discussions-button");

        const totalDiscussions =
            document.getElementById("total-discussions");

        const matchingDiscussions =
            document.getElementById("matching-discussions");

        const cardTemplate =
            document.getElementById("admin-discussion-card-template");

        const deleteDialog =
            document.getElementById("delete-discussion-dialog");

        const deleteDiscussionName =
            document.getElementById("delete-discussion-name");

        const cancelDeleteButton =
            document.getElementById("cancel-delete-discussion");

        const confirmDeleteButton =
            document.getElementById("confirm-delete-discussion");

        const requiredElements = [
            searchInput,
            sortSelect,
            clearFiltersButton,
            loadingState,
            errorState,
            successState,
            successMessage,
            emptyState,
            discussionList,
            retryButton,
            totalDiscussions,
            matchingDiscussions,
            cardTemplate,
            deleteDialog,
            deleteDiscussionName,
            cancelDeleteButton,
            confirmDeleteButton
        ];

        if (requiredElements.some((element) => !element)) {
            console.error(
                "Admin discussions: required HTML elements are missing."
            );
            return;
        }

        // ==========================================
        // 2. APPLICATION STATE
        // ==========================================

        const state = {
            discussions: [],
            selectedDiscussionId: null,
            selectedDiscussionTitle: "",
            isLoading: false,
            isDeleting: false
        };

        // ==========================================
        // 3. STATUS MESSAGE HELPERS
        // ==========================================

        function showMessage(element, message) {
            element.textContent = message;
            element.hidden = false;
        }

        function hideMessage(element) {
            element.hidden = true;
        }

        function showError(message) {
            hideMessage(successState);
            showMessage(errorState, message);
        }

        function showInformation(message) {
            hideMessage(errorState);
            showMessage(successState, message);
        }

        function getErrorMessage(data, fallback) {
            if (
                data &&
                typeof data.message === "string" &&
                data.message.trim()
            ) {
                return data.message;
            }

            return fallback;
        }

        async function readJsonResponse(response) {
            try {
                return await response.json();
            } catch {
                return {};
            }
        }

        function setLoading(isLoading) {
            state.isLoading = isLoading;

            loadingState.hidden = !isLoading;

            discussionList.setAttribute(
                "aria-busy",
                String(isLoading)
            );

            retryButton.disabled = isLoading;
            clearFiltersButton.disabled = isLoading;
            searchInput.disabled = isLoading;
            sortSelect.disabled = isLoading;
        }

        // ==========================================
        // 4. DISCUSSION DATA NORMALIZATION
        // ==========================================

        function normalizeDiscussion(discussion) {
            if (
                !discussion ||
                typeof discussion !== "object" ||
                discussion.id === undefined ||
                discussion.id === null
            ) {
                return null;
            }

            return {
                id: discussion.id,
                title: String(discussion.title ?? ""),
                content: String(discussion.content ?? ""),
                createdAt: String(discussion.created_at ?? ""),
                author: String(discussion.author ?? "")
            };
        }

        function formatDate(dateValue) {
            if (!dateValue) {
                return "Date unavailable";
            }

            const date = new Date(dateValue);

            if (Number.isNaN(date.getTime())) {
                return "Date unavailable";
            }

            return date.toLocaleString();
        }

        // ==========================================
        // 5. SUMMARY COUNTERS
        // ==========================================

        function updateSummary(matchingCount) {
            totalDiscussions.textContent =
                String(state.discussions.length);

            matchingDiscussions.textContent =
                String(matchingCount);
        }

        // ==========================================
        // 6. DISCUSSION DETAILS DIALOG
        // ==========================================

        /*
         * Create the details dialog dynamically so the existing
         * HTML file does not need another dialog element.
         *
         * User-provided discussion content is always inserted
         * through textContent, never interpreted as HTML.
         */

        let detailsDialog = null;

        function createDetailsDialog() {
            if (detailsDialog) {
                return detailsDialog;
            }

            detailsDialog = document.createElement("dialog");
            detailsDialog.className = "admin-discussion-details-dialog";
            detailsDialog.setAttribute(
                "aria-labelledby",
                "admin-discussion-details-heading"
            );

            const container = document.createElement("div");
            container.className = "admin-discussion-details-content";

            const heading = document.createElement("h2");
            heading.id = "admin-discussion-details-heading";
            heading.textContent = "Discussion details";

            const titleLabel = document.createElement("h3");
            titleLabel.textContent = "Title";

            const titleValue = document.createElement("p");

            const authorLabel = document.createElement("h3");
            authorLabel.textContent = "Author";

            const authorValue = document.createElement("p");

            const dateLabel = document.createElement("h3");
            dateLabel.textContent = "Created";

            const dateValue = document.createElement("p");

            const contentLabel = document.createElement("h3");
            contentLabel.textContent = "Discussion content";

            const contentValue = document.createElement("p");
            contentValue.className = "admin-discussion-details-text";
            contentValue.style.whiteSpace = "pre-wrap";
            contentValue.style.overflowWrap = "anywhere";

            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.textContent = "Close";

            closeButton.addEventListener("click", () => {
                detailsDialog.close();
            });

            container.append(
                heading,
                titleLabel,
                titleValue,
                authorLabel,
                authorValue,
                dateLabel,
                dateValue,
                contentLabel,
                contentValue,
                closeButton
            );

            detailsDialog.appendChild(container);
            document.body.appendChild(detailsDialog);

            detailsDialog.addEventListener("click", (event) => {
                if (event.target === detailsDialog) {
                    detailsDialog.close();
                }
            });

            detailsDialog._fields = {
                titleValue,
                authorValue,
                dateValue,
                contentValue
            };

            return detailsDialog;
        }

        function viewDiscussion(discussion) {
            const dialog = createDetailsDialog();
            const fields = dialog._fields;

            fields.titleValue.textContent =
                discussion.title || "Untitled discussion";

            fields.authorValue.textContent =
                discussion.author || "Author unavailable";

            fields.dateValue.textContent =
                formatDate(discussion.createdAt);

            fields.contentValue.textContent =
                discussion.content || "No discussion content available.";

            if (!dialog.open) {
                dialog.showModal();
            }
        }

        // ==========================================
        // 7. DISCUSSION CARD CREATION
        // ==========================================

        function createDiscussionCard(discussion) {
            const card = cardTemplate.content.cloneNode(true);

            const article =
                card.querySelector(".discussion-management-card");

            const title =
                card.querySelector(".discussion-card-title");

            const preview =
                card.querySelector(".discussion-card-preview");

            const author =
                card.querySelector(".discussion-card-author");

            const date =
                card.querySelector(".discussion-card-date");

            const viewButton =
                card.querySelector(".discussion-view-button");

            const moderateButton =
                card.querySelector(".discussion-moderate-button");

            const deleteButton =
                card.querySelector(".discussion-delete-button");

            title.textContent =
                discussion.title || "Untitled discussion";

            preview.textContent =
                discussion.content || "No discussion content available.";

            author.textContent = discussion.author
                ? `By ${discussion.author}`
                : "Author unavailable";

            date.textContent = formatDate(discussion.createdAt);

            if (article) {
                article.dataset.discussionId = String(discussion.id);
            }

            if (viewButton) {
                viewButton.addEventListener("click", () => {
                    viewDiscussion(discussion);
                });
            }

            if (moderateButton) {
                moderateButton.addEventListener("click", () => {
                    handleModerate(discussion);
                });
            }

            if (deleteButton) {
                deleteButton.addEventListener("click", () => {
                    openDeleteDialog(discussion);
                });
            }

            return card;
        }

        // ==========================================
        // 8. SEARCH AND SORT
        // ==========================================

        function getFilteredAndSortedDiscussions() {
            const query = searchInput.value.trim().toLowerCase();
            const sortOrder = sortSelect.value;

            const filtered = state.discussions.filter((discussion) => {
                const searchableText = [
                    discussion.title,
                    discussion.content,
                    discussion.author
                ]
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            });

            filtered.sort((first, second) => {
                const firstTime =
                    new Date(first.createdAt).getTime();

                const secondTime =
                    new Date(second.createdAt).getTime();

                if (Number.isNaN(firstTime)) {
                    return Number.isNaN(secondTime) ? 0 : 1;
                }

                if (Number.isNaN(secondTime)) {
                    return -1;
                }

                return sortOrder === "oldest"
                    ? firstTime - secondTime
                    : secondTime - firstTime;
            });

            return filtered;
        }

        // ==========================================
        // 9. RENDER DISCUSSIONS
        // ==========================================

        function renderDiscussions() {
            const discussions = getFilteredAndSortedDiscussions();

            discussionList.replaceChildren();

            discussions.forEach((discussion) => {
                discussionList.appendChild(
                    createDiscussionCard(discussion)
                );
            });

            updateSummary(discussions.length);

            const heading = emptyState.querySelector("h3");
            const description = emptyState.querySelector("p");

            if (state.discussions.length === 0) {
                emptyState.hidden = false;

                if (heading) {
                    heading.textContent = "No discussions available";
                }

                if (description) {
                    description.textContent =
                        "Discussions will appear here when they are available.";
                }

                return;
            }

            if (discussions.length === 0) {
                emptyState.hidden = false;

                if (heading) {
                    heading.textContent = "No matching discussions";
                }

                if (description) {
                    description.textContent =
                        "Try changing your search or clearing the filters.";
                }

                return;
            }

            emptyState.hidden = true;
        }

        // ==========================================
        // 10. LOAD DISCUSSIONS FROM ADMIN API
        // ==========================================

        async function loadDiscussions() {
            if (state.isLoading || state.isDeleting) {
                return;
            }

            setLoading(true);

            hideMessage(errorState);
            hideMessage(successState);

            emptyState.hidden = true;
            discussionList.replaceChildren();

            try {
                const response = await fetch("/api/admin/discussions", {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    },
                    credentials: "same-origin"
                });

                const data = await readJsonResponse(response);

                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Your administrator session may have expired or you are not authorized. Please sign in again."
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            `Failed to load discussions (HTTP ${response.status}).`
                        )
                    );
                }

                if (!Array.isArray(data)) {
                    throw new Error(
                        "The administrator discussions API returned an unexpected response."
                    );
                }

                state.discussions = data
                    .map(normalizeDiscussion)
                    .filter((discussion) => discussion !== null);

                renderDiscussions();
            } catch (error) {
                console.error(
                    "Unable to load admin discussions:",
                    error
                );

                state.discussions = [];
                discussionList.replaceChildren();
                emptyState.hidden = true;

                updateSummary(0);

                showError(
                    error.message ||
                    "Discussions could not be loaded. Please try again."
                );
            } finally {
                setLoading(false);
            }
        }

        // ==========================================
        // 11. MODERATION ACTION
        // ==========================================

        function handleModerate(discussion) {
            /*
             * No moderation endpoint or moderation behavior has
             * been implemented in the current backend.
             *
             * Do not change discussion data or claim that an
             * action succeeded until a real moderation workflow
             * and its authorization rules exist.
             */

            hideMessage(errorState);

            showInformation(
                "Moderation is not available yet. No changes were made to this discussion."
            );

            console.info(
                "Moderation requested for discussion:",
                discussion.id
            );
        }

        // ==========================================
        // 12. DELETE CONFIRMATION DIALOG
        // ==========================================

        function openDeleteDialog(discussion) {
            if (
                discussion.id === undefined ||
                discussion.id === null ||
                String(discussion.id).trim() === ""
            ) {
                showError("This discussion does not have a valid ID.");
                return;
            }

            if (state.isDeleting) {
                return;
            }

            state.selectedDiscussionId = discussion.id;

            state.selectedDiscussionTitle =
                discussion.title || "this discussion";

            deleteDiscussionName.textContent =
                state.selectedDiscussionTitle;

            hideMessage(errorState);
            hideMessage(successState);

            confirmDeleteButton.disabled = false;

            if (typeof deleteDialog.showModal === "function") {
                if (!deleteDialog.open) {
                    deleteDialog.showModal();
                }
            } else {
                deleteDialog.setAttribute("open", "");
            }
        }

        function closeDeleteDialog() {
            if (state.isDeleting) {
                return;
            }

            state.selectedDiscussionId = null;
            state.selectedDiscussionTitle = "";

            if (deleteDialog.open) {
                deleteDialog.close();
            } else {
                deleteDialog.removeAttribute("open");
            }
        }

        // ==========================================
        // 13. DELETE DISCUSSION THROUGH ADMIN API
        // ==========================================

        async function deleteDiscussion() {
            if (state.isDeleting || state.isLoading) {
                return;
            }

            if (
                state.selectedDiscussionId === null ||
                state.selectedDiscussionId === undefined
            ) {
                closeDeleteDialog();
                showError("No discussion was selected.");
                return;
            }

            const discussionId = state.selectedDiscussionId;
            const discussionTitle = state.selectedDiscussionTitle;

            state.isDeleting = true;
            confirmDeleteButton.disabled = true;
            cancelDeleteButton.disabled = true;

            try {
                const response = await fetch(
                    `/api/admin/discussions/${encodeURIComponent(
                        String(discussionId)
                    )}`,
                    {
                        method: "DELETE",
                        headers: {
                            Accept: "application/json"
                        },
                        credentials: "same-origin"
                    }
                );

                const data = await readJsonResponse(response);

                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Your administrator session may have expired or you are not authorized. Please sign in again."
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            response.status === 404
                                ? "This discussion no longer exists."
                                : `The discussion could not be deleted (HTTP ${response.status}).`
                        )
                    );
                }

                // Remove the discussion from the local list only
                // after the backend confirms that deletion succeeded.
                state.discussions = state.discussions.filter(
                    (discussion) =>
                        String(discussion.id) !== String(discussionId)
                );

                state.selectedDiscussionId = null;
                state.selectedDiscussionTitle = "";

                if (deleteDialog.open) {
                    deleteDialog.close();
                } else {
                    deleteDialog.removeAttribute("open");
                }

                renderDiscussions();

                showInformation(
                    getErrorMessage(
                        data,
                        `Discussion "${discussionTitle}" was deleted successfully.`
                    )
                );
            } catch (error) {
                console.error(
                    "Unable to delete admin discussion:",
                    error
                );

                showError(
                    error.message ||
                    "The discussion could not be deleted. Please try again."
                );

                // Keep the confirmation dialog open so the
                // administrator can review or retry the action.
            } finally {
                state.isDeleting = false;
                confirmDeleteButton.disabled = false;
                cancelDeleteButton.disabled = false;
            }
        }

        // ==========================================
        // 14. CLEAR SEARCH AND SORT FILTERS
        // ==========================================

        function clearFilters() {
            searchInput.value = "";
            sortSelect.value = "newest";

            hideMessage(errorState);
            hideMessage(successState);

            renderDiscussions();
        }

        // ==========================================
        // 15. EVENT LISTENERS
        // ==========================================

        searchInput.addEventListener(
            "input",
            renderDiscussions
        );

        sortSelect.addEventListener(
            "change",
            renderDiscussions
        );

        clearFiltersButton.addEventListener(
            "click",
            clearFilters
        );

        retryButton.addEventListener(
            "click",
            loadDiscussions
        );

        cancelDeleteButton.addEventListener(
            "click",
            closeDeleteDialog
        );

        confirmDeleteButton.addEventListener(
            "click",
            deleteDiscussion
        );

        deleteDialog.addEventListener("cancel", (event) => {
            if (state.isDeleting) {
                event.preventDefault();
                return;
            }

            state.selectedDiscussionId = null;
            state.selectedDiscussionTitle = "";
        });

        // ==========================================
        // 16. INITIALIZE PAGE
        // ==========================================

        loadDiscussions();
    });
})();
